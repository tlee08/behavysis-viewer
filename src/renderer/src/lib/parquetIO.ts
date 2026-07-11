import {
  parquetMetadataAsync,
  parquetReadObjects,
  parquetSchema,
} from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetWriteBuffer } from "hyparquet-writer";
import type {
  ActualValue,
  Bout,
  KeypointData,
  KeypointDef,
} from "../../../shared/types";
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

// 7_behaviour_scored: long-form (frame, behaviour, actual, [user_defined...]).
// One row per (frame, behaviour). A bout is a contiguous run of non-zero
// `actual` frames within a behaviour.
export async function loadBehavParquet(buffer: Uint8Array): Promise<Bout[]> {
  const rows = await readRows(buffer);
  if (rows.length === 0) return [];

  const userCols = Object.keys(rows[0]).filter(
    (c) => c !== "frame" && c !== "behaviour" && c !== "actual",
  );

  const rowsByBehav = new Map<string, Row[]>();
  for (const r of rows) {
    const behav = String(r.behaviour);
    if (!rowsByBehav.has(behav)) rowsByBehav.set(behav, []);
    rowsByBehav.get(behav)!.push(r);
  }

  const allBouts: Bout[] = [];
  for (const [behav, behavRows] of rowsByBehav) {
    behavRows.sort((a, b) => Number(a.frame) - Number(b.frame));

    const behavUserCols = userCols.filter((c) =>
      behavRows.some((r) => r[c] != null),
    );

    let run = -1;
    for (let k = 0; k <= behavRows.length; k++) {
      const active = k < behavRows.length && Number(behavRows[k].actual) !== 0;
      if (active) {
        if (run === -1) run = k;
      } else if (run !== -1) {
        const s = behavRows[run];
        const e = behavRows[k - 1];
        const userDefined: Record<string, ActualValue> = {};
        for (const c of behavUserCols) {
          userDefined[c] = clampActual(Number(s[c]));
        }
        allBouts.push({
          id: 0,
          start: Number(s.frame),
          stop: Number(e.frame),
          behav,
          actual: clampActual(Number(s.actual)),
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
    const key = `${r.individual}_${r.bodypart}`;
    if (!defIndex.has(key)) {
      defIndex.set(key, defs.length);
      defs.push({
        indiv: String(r.individual),
        bpt: String(r.bodypart),
        color: "#ffffff",
      });
    }
    const f = Number(r.frame);
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
    const d = defIndex.get(`${r.individual}_${r.bodypart}`)!;
    const f = Number(r.frame);
    x[d][f] = Number(r.x);
    y[d][f] = Number(r.y);
    likelihood[d][f] = Number(r.likelihood);
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
    .filter((name) => name !== "frame");
}

export async function loadFeatureData(
  buffer: Uint8Array,
  columns: string[],
): Promise<Record<string, Float64Array>> {
  if (columns.length === 0) return {};

  const rows = await readRows(buffer, ["frame", ...columns]);
  rows.sort((a, b) => Number(a.frame) - Number(b.frame));

  const data: Record<string, Float64Array> = {};
  for (const col of columns) {
    const arr = new Float64Array(rows.length);
    for (let i = 0; i < rows.length; i++) arr[i] = Number(rows[i][col]);
    data[col] = arr;
  }
  return data;
}

// Write scored bouts back to 7_behaviour_scored long-form
// (frame, behaviour, actual, [user_defined...]).
export function saveBehavParquet(
  startFrame: number,
  stopFrame: number,
  bouts: Bout[],
): Uint8Array {
  const behavs = [...new Set(bouts.map((b) => b.behav))].sort();
  const udKeys = [...new Set(bouts.flatMap((b) => Object.keys(b.userDefined)))];

  const numFrames = stopFrame - startFrame + 1;
  const rowCount = behavs.length * numFrames;

  const frame = new BigInt64Array(rowCount);
  const behaviour = new Array<string>(rowCount);
  const actual = new BigInt64Array(rowCount);
  const ud: Record<string, BigInt64Array> = {};
  for (const k of udKeys) ud[k] = new BigInt64Array(rowCount);

  const rowOf = (behavIdx: number, f: number) =>
    behavIdx * numFrames + (f - startFrame);

  for (let bi = 0; bi < behavs.length; bi++) {
    for (let f = startFrame; f <= stopFrame; f++) {
      const i = rowOf(bi, f);
      frame[i] = BigInt(f);
      behaviour[i] = behavs[bi];
    }
  }

  const behavIndex = new Map(behavs.map((b, i) => [b, i]));
  for (const b of bouts) {
    const bi = behavIndex.get(b.behav)!;
    for (let f = b.start; f <= b.stop; f++) {
      if (f < startFrame || f > stopFrame) continue;
      const i = rowOf(bi, f);
      actual[i] = BigInt(b.actual);
      for (const [k, v] of Object.entries(b.userDefined)) ud[k][i] = BigInt(v);
    }
  }

  const columnData = [
    { name: "frame", data: frame, type: "INT64" as const },
    { name: "behaviour", data: behaviour, type: "STRING" as const },
    { name: "actual", data: actual, type: "INT64" as const },
    ...udKeys.map((k) => ({ name: k, data: ud[k], type: "INT64" as const })),
  ];

  const arrayBuffer = parquetWriteBuffer({ columnData, codec: "SNAPPY" });
  return new Uint8Array(arrayBuffer);
}
