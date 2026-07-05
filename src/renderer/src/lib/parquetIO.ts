import type * as arrow from "apache-arrow";
import type {
  ActualValue,
  Bout,
  KeypointDef,
  KeypointFrame,
} from "../../../shared/types";
import { generateColors } from "./colors";
import { parseKptColumns } from "./columnNames";
import { getDuckDB } from "./duckdb";

function clampActual(v: number): -2 | -1 | 0 | 1 {
  if (v >= 1) return 1;
  if (v <= -2) return -2;
  if (v === -1) return -1;
  return 0;
}

function getRow0Frame(columns: string[], table: arrow.Table): number {
  const indexCols = ["__index_level_0__", "frame"];
  for (const name of indexCols) {
    if (columns.includes(name)) {
      const col = table.getChild(name);
      if (col && col.length > 0) return Number(col.get(0));
    }
  }
  return 0;
}

function readCol(t: arrow.Table, name: string): Int8Array {
  const child = t.getChild(name);
  if (!child) throw new Error(`Column not found: ${name}`);
  return Int8Array.from(child.toArray() as number[]);
}

function framesToBouts(
  signal: Int8Array,
  behav: string,
  userDefCols: Map<string, Int8Array>,
  offset: number,
): Bout[] {
  const bouts: Bout[] = [];
  const len = signal.length;

  const emit = (start: number, stop: number) => {
    const userDefined: Record<string, ActualValue> = {};
    for (const [key, vec] of userDefCols) {
      userDefined[key] = clampActual(vec[start]);
    }
    bouts.push({
      id: 0,
      start: start + offset,
      stop: stop + offset,
      behav,
      actual: clampActual(signal[start]),
      userDefined,
    });
  };

  let run = -1;
  for (let i = 0; i <= len; i++) {
    if (i < len && signal[i] !== 0) {
      if (run === -1) run = i;
    } else if (run !== -1) {
      emit(run, i - 1);
      run = -1;
    }
  }

  return bouts;
}

export async function loadBehavParquet(
  buffer: Uint8Array,
): Promise<{ bouts: Bout[]; numFrames: number }> {
  const db = await getDuckDB();
  const conn = await db.connect();

  let pathId: string | null = null;
  try {
    pathId = `behav_${Date.now()}.parquet`;
    await db.registerFileBuffer(pathId, buffer);
    const t = await conn.query(`SELECT * FROM read_parquet('${pathId}')`);

    const columns = t.schema.fields.map((f: arrow.Field) => f.name);
    const offset = getRow0Frame(columns, t);

    const udIndex = new Map<string, Map<string, string>>();
    for (const c of columns) {
      const sep = c.indexOf("__");
      if (sep < 0 || c.endsWith("__actual")) continue;
      const behav = c.slice(0, sep);
      const type = c.slice(sep + 2);
      if (!udIndex.has(behav)) udIndex.set(behav, new Map());
      udIndex.get(behav)!.set(type, c);
    }

    const allBouts: Bout[] = [];

    for (const col of columns) {
      if (!col.endsWith("__actual")) continue;

      const behav = col.slice(0, -8);
      const signal = readCol(t, col);

      const userDefCols = new Map<string, Int8Array>();
      for (const [type, c] of udIndex.get(behav) ?? []) {
        userDefCols.set(type, readCol(t, c));
      }

      allBouts.push(...framesToBouts(signal, behav, userDefCols, offset));
    }

    allBouts.sort(
      (a, b) => a.start - b.start || a.behav.localeCompare(b.behav),
    );
    allBouts.forEach((b, i) => (b.id = i));

    return { bouts: allBouts, numFrames: offset + t.numRows };
  } finally {
    if (pathId) try { await db.dropFile(pathId); } catch {}
    await conn.close();
  }
}

export async function loadKeypointsParquet(
  buffer: Uint8Array,
  pcutoff: number,
): Promise<{ keypointDefs: KeypointDef[]; keypointFrames: KeypointFrame[] }> {
  const db = await getDuckDB();
  const conn = await db.connect();

  let pathId: string | null = null;
  try {
    pathId = `kpts_${Date.now()}.parquet`;
    await db.registerFileBuffer(pathId, buffer);
    const result = await conn.query(`SELECT * FROM read_parquet('${pathId}')`);

    const columns = result.schema.fields.map((f: arrow.Field) => f.name);
    const row0Frame = getRow0Frame(columns, result);
    const kptCols = parseKptColumns(columns);

    if (kptCols.length === 0) {
      return { keypointDefs: [], keypointFrames: [] };
    }

    const seen = new Set<string>();
    const kptKeys: { key: string; indiv: string; bpt: string }[] = [];
    for (const { indiv, bpt } of kptCols) {
      const key = `${indiv}_${bpt}`;
      if (!seen.has(key)) {
        seen.add(key);
        kptKeys.push({ key, indiv, bpt });
      }
    }

    const indivs = [...new Set(kptKeys.map((k) => k.indiv))];
    const indivColors = generateColors(indivs.length);
    const indivColorMap = new Map(
      indivs.map((ind, i) => [ind, indivColors[i]]),
    );

    const keypointDefs: KeypointDef[] = kptKeys.map(({ key, indiv, bpt }) => ({
      key,
      indiv,
      bpt,
      color: indivColorMap.get(indiv) ?? "#ffffff",
    }));

    const numRows = result.numRows;
    const totalFrames = row0Frame + numRows;
    const keypointFrames: KeypointFrame[] = new Array(totalFrames);

    for (const { arrowName, indiv, bpt, coord } of kptCols) {
      const child = result.getChild(arrowName);
      if (!child) continue;
      const vec = child.toArray();
      const key = `${indiv}_${bpt}`;
      for (let i = 0; i < numRows; i++) {
        const frameIdx = row0Frame + i;
        let frame = keypointFrames[frameIdx];
        if (!frame) {
          frame = {};
          keypointFrames[frameIdx] = frame;
        }
        if (!frame[key]) {
          frame[key] = { x: 0, y: 0, likelihood: 0 };
        }
        frame[key][coord] = vec[i];
      }
    }

    for (let i = row0Frame; i < totalFrames; i++) {
      const frame = keypointFrames[i];
      if (!frame) continue;
      for (const kpt of kptKeys) {
        const e = frame[kpt.key];
        if (e && e.likelihood < pcutoff) {
          frame[kpt.key] = { x: 0, y: 0, likelihood: 0 };
        }
      }
    }

    return { keypointDefs, keypointFrames };
  } finally {
    if (pathId) try { await db.dropFile(pathId); } catch {}
    await conn.close();
  }
}

export async function loadFeatureColumns(
  buffer: Uint8Array,
): Promise<string[]> {
  const db = await getDuckDB();
  const conn = await db.connect();

  let pathId: string | null = null;
  try {
    pathId = `feat_${Date.now()}.parquet`;
    await db.registerFileBuffer(pathId, buffer);
    const result = await conn.query(
      `SELECT * FROM read_parquet('${pathId}') LIMIT 1`,
    );
    return result.schema.fields.map((f: arrow.Field) => f.name);
  } finally {
    if (pathId) try { await db.dropFile(pathId); } catch {}
    await conn.close();
  }
}

export async function loadFeatureData(
  buffer: Uint8Array,
  columns: string[],
): Promise<Record<string, Float64Array>> {
  if (columns.length === 0) return {};

  const db = await getDuckDB();
  const conn = await db.connect();

  let pathId: string | null = null;
  try {
    pathId = `featd_${Date.now()}.parquet`;
    await db.registerFileBuffer(pathId, buffer);

    const colList = columns.map((c: string) => `"${c}"`).join(", ");
    const result = await conn.query(
      `SELECT ${colList} FROM read_parquet('${pathId}')`,
    );

    const data: Record<string, Float64Array> = {};
    for (const col of columns) {
      const vec = result.getChild(col);
      if (vec) {
        data[col] = Float64Array.from(vec.toArray(), Number);
      }
    }

    return data;
  } finally {
    if (pathId) try { await db.dropFile(pathId); } catch {}
    await conn.close();
  }
}

export async function saveBehavParquet(
  startFrame: number,
  stopFrame: number,
  bouts: Bout[],
): Promise<Uint8Array> {
  const db = await getDuckDB();
  const conn = await db.connect();

  let outId: string | null = null;
  try {
    outId = `save_out_${Date.now()}.parquet`;

    await conn.query(
      `CREATE OR REPLACE TABLE data AS SELECT generate_series AS "frame" FROM generate_series(${startFrame}, ${stopFrame})`,
    );

    const byBehav = new Map<string, Bout[]>();
    const udKeys = new Map<string, Set<string>>();
    for (const b of bouts) {
      if (!byBehav.has(b.behav)) byBehav.set(b.behav, []);
      byBehav.get(b.behav)!.push(b);
      for (const k of Object.keys(b.userDefined)) {
        if (!udKeys.has(b.behav)) udKeys.set(b.behav, new Set());
        udKeys.get(b.behav)!.add(k);
      }
    }

    for (const [behav, behavBouts] of byBehav) {
      await conn.query(
        `ALTER TABLE data ADD COLUMN "${behav}__actual" TINYINT DEFAULT 0`,
      );
      for (const b of behavBouts) {
        await conn.query(
          `UPDATE data SET "${behav}__actual" = ${b.actual} WHERE "frame" BETWEEN ${b.start} AND ${b.stop}`,
        );
      }

      for (const udKey of udKeys.get(behav) ?? []) {
        await conn.query(
          `ALTER TABLE data ADD COLUMN "${behav}__${udKey}" TINYINT DEFAULT 0`,
        );
        for (const b of behavBouts) {
          const val = b.userDefined[udKey];
          if (val !== undefined) {
            await conn.query(
              `UPDATE data SET "${behav}__${udKey}" = ${val} WHERE "frame" BETWEEN ${b.start} AND ${b.stop}`,
            );
          }
        }
      }
    }

    await conn.query(
      `COPY data TO '${outId}' (FORMAT PARQUET, COMPRESSION ZSTD)`,
    );

    return await db.copyFileToBuffer(outId);
  } finally {
    if (outId) try { await db.dropFile(outId); } catch {}
    await conn.close();
  }
}
