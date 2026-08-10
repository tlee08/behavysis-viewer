import {
  parquetMetadataAsync,
  parquetReadObjects,
  parquetSchema,
} from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetWriteBuffer } from "hyparquet-writer";
import { COLS } from "../shared/behavysisContract";
import type {
  ActualValue,
  Bout,
  KeypointData,
  KeypointDef,
} from "../shared/types";
import { generateColors } from "./colors";

type Row = Record<string, unknown>;

function toArrayBuffer(buffer: Uint8Array): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

function clampActual(v: number): ActualValue {
  if (v >= 1) return 1;
  if (v <= -2) return -2;
  if (v === -1) return -1;
  return 0;
}

async function readRows(
  buffer: Uint8Array,
  columns?: string[],
): Promise<Row[]> {
  return parquetReadObjects({
    file: toArrayBuffer(buffer),
    compressors,
    columns,
  });
}

// 7_behaviour_scored: wide (frame + behaviour-name columns + sub-behaviour
// columns, all Int64). Built by make_scored_schema(classify_behaviour).
// A bout is a contiguous run of non-zero values within a behaviour column.
// Sub-behaviour values for each bout are taken from the first frame of the run.
export async function loadBehavParquet(
  buffer: Uint8Array,
  classifyBehaviour: Record<string, string[]>,
): Promise<Bout[]> {
  const rows = await readRows(buffer);
  if (rows.length === 0) return [];

  rows.sort((a, b) => Number(a[COLS.frame]) - Number(b[COLS.frame]));

  const allBouts: Bout[] = [];
  for (const [behav, subBehavs] of Object.entries(classifyBehaviour)) {
    let run = -1;
    for (let k = 0; k <= rows.length; k++) {
      const active = k < rows.length && Number(rows[k][behav]) !== 0;
      if (active) {
        if (run === -1) run = k;
      } else if (run !== -1) {
        const s = rows[run];
        const e = rows[k - 1];
        const userDefined: Record<string, ActualValue> = {};
        for (const sub of subBehavs) {
          userDefined[sub] = clampActual(Number(s[sub]));
        }
        allBouts.push({
          id: 0,
          start: Number(s[COLS.frame]),
          stop: Number(e[COLS.frame]),
          behav,
          actual: clampActual(Number(s[behav])),
          userDefined,
        });
        run = -1;
      }
    }
  }

  allBouts.sort((a, b) => a.start - b.start || a.behav.localeCompare(b.behav));
  allBouts.forEach((b, i) => (b.id = i));
  return allBouts;
}

// 4_preprocessed: long-form (frame, individual, bodypart, x, y, likelihood).
// One row per (frame, individual, bodypart) coordinate triplet.
// Returns columnar arrays indexed by absolute frame; pcutoff is applied at
// draw time so the slider can change live without losing data.
export async function loadKeypointsParquet(
  buffer: Uint8Array,
): Promise<KeypointData> {
  const rows = await readRows(buffer);
  if (rows.length === 0) {
    return { numFrames: 0, defs: [], x: [], y: [], likelihood: [] };
  }

  const defIndex = new Map<string, number>();
  const defs: KeypointDef[] = [];
  let maxFrame = 0;
  for (const r of rows) {
    const key = `${r[COLS.individual]}_${r[COLS.bodypart]}`;
    if (!defIndex.has(key)) {
      defIndex.set(key, defs.length);
      defs.push({
        indiv: String(r[COLS.individual]),
        bpt: String(r[COLS.bodypart]),
        color: "#ffffff",
      });
    }
    const f = Number(r[COLS.frame]);
    if (f > maxFrame) maxFrame = f;
  }

  const indivs = [...new Set(defs.map((d) => d.indiv))];
  const indivColors = generateColors(indivs.length);
  const indivColorMap = new Map(indivs.map((ind, i) => [ind, indivColors[i]]));
  for (const d of defs) d.color = indivColorMap.get(d.indiv) ?? "#ffffff";

  const numFrames = maxFrame + 1;
  const x = defs.map(() => new Float32Array(numFrames));
  const y = defs.map(() => new Float32Array(numFrames));
  const likelihood = defs.map(() => new Float32Array(numFrames));

  for (const r of rows) {
    const d = defIndex.get(`${r[COLS.individual]}_${r[COLS.bodypart]}`)!;
    const f = Number(r[COLS.frame]);
    x[d][f] = Number(r[COLS.x]);
    y[d][f] = Number(r[COLS.y]);
    likelihood[d][f] = Number(r[COLS.likelihood]);
  }

  return { numFrames, defs, x, y, likelihood };
}

// 5_features_extracted: wide (frame + dynamic Float64 feature columns).
// Feature column names exclude the `frame` index column.
export async function loadFeatureColumns(
  buffer: Uint8Array,
): Promise<string[]> {
  const metadata = await parquetMetadataAsync(toArrayBuffer(buffer));
  const schema = parquetSchema(metadata);
  return schema.children
    .map((c) => c.element.name)
    .filter((name) => name !== COLS.frame);
}

export async function loadFeatureData(
  buffer: Uint8Array,
  columns: string[],
): Promise<Record<string, Float64Array>> {
  if (columns.length === 0) return {};

  const rows = await readRows(buffer, [COLS.frame, ...columns]);
  rows.sort((a, b) => Number(a[COLS.frame]) - Number(b[COLS.frame]));

  const data: Record<string, Float64Array> = {};
  for (const col of columns) {
    const arr = new Float64Array(rows.length);
    for (let i = 0; i < rows.length; i++) arr[i] = Number(rows[i][col]);
    data[col] = arr;
  }
  return data;
}

// Write scored bouts back to 7_behaviour_scored wide format
// (frame + behaviour columns + sub-behaviour columns, all Int64).
export function saveBehavParquet(
  startFrame: number,
  stopFrame: number,
  bouts: Bout[],
  classifyBehaviour: Record<string, string[]>,
): Uint8Array {
  const numFrames = stopFrame - startFrame + 1;
  const behavCols = Object.keys(classifyBehaviour);
  const subCols = Object.values(classifyBehaviour).flat();
  const allCols = [...behavCols, ...subCols];

  const frame = new BigInt64Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    frame[i] = BigInt(startFrame + i);
  }

  const dataArrays: Record<string, BigInt64Array> = {};
  for (const col of allCols) {
    dataArrays[col] = new BigInt64Array(numFrames);
  }

  for (const b of bouts) {
    const arr = dataArrays[b.behav];
    if (!arr) continue;
    for (let f = b.start; f <= b.stop; f++) {
      if (f < startFrame || f > stopFrame) continue;
      arr[f - startFrame] = BigInt(b.actual);
    }
    for (const [sub, val] of Object.entries(b.userDefined)) {
      const subArr = dataArrays[sub];
      if (!subArr) continue;
      for (let f = b.start; f <= b.stop; f++) {
        if (f < startFrame || f > stopFrame) continue;
        subArr[f - startFrame] = BigInt(val);
      }
    }
  }

  const columnData = [
    { name: COLS.frame, data: frame, type: "INT64" as const },
    ...allCols.map((col) => ({
      name: col,
      data: dataArrays[col],
      type: "INT64" as const,
    })),
  ];

  const arrayBuffer = parquetWriteBuffer({ columnData, codec: "SNAPPY" });
  return new Uint8Array(arrayBuffer);
}
