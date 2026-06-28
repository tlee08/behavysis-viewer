import type * as arrow from "apache-arrow";
import { getDuckDB } from "./duckdb";
import type { Bout, KeypointDef, KeypointFrame } from "../../../shared/types";
import { UNSURE } from "../../../shared/types";
import { parseTuple2, parseKptColumns } from "./columnNames";
import { generateColors } from "./colors";

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

function migrateActual(preds: Int8Array, oldActuals: Int8Array): Int8Array {
  const result = new Int8Array(preds.length);
  for (let i = 0; i < preds.length; i++) {
    if (preds[i] === 0) {
      result[i] = 0;
    } else {
      const a = oldActuals[i];
      if (a >= 1) result[i] = 1;
      else if (a === 0) result[i] = -1;
      else result[i] = -2;
    }
  }
  return result;
}

function framesToBouts(
  actuals: Int8Array,
  behav: string,
  userDefCols: Map<string, Int8Array>,
  offset: number,
): Bout[] {
  const bouts: Bout[] = [];
  const numFrames = actuals.length;

  const pushBout = (startRow: number, stopRow: number) => {
    const userDefined: Record<string, -2 | -1 | 0 | 1> = {};
    for (const [key, vec] of userDefCols) {
      userDefined[key] = clampActual(vec[startRow]);
    }
    bouts.push({
      id: 0,
      start: startRow + offset,
      stop: stopRow + offset,
      behav,
      actual: clampActual(actuals[startRow]),
      userDefined,
    });
  };

  let runStart = -1;
  for (let i = 0; i < numFrames; i++) {
    const isBout = actuals[i] !== 0;
    if (isBout && runStart === -1) {
      runStart = i;
    } else if (!isBout && runStart !== -1) {
      pushBout(runStart, i - 1);
      runStart = -1;
    }
  }
  if (runStart !== -1) pushBout(runStart, numFrames - 1);

  return bouts;
}

export async function loadBehavParquet(
  buffer: Uint8Array,
): Promise<{ bouts: Bout[]; numFrames: number }> {
  const db = await getDuckDB();
  const conn = await db.connect();

  try {
    const pathId = `behav_${Date.now()}.parquet`;
    await db.registerFileBuffer(pathId, buffer);
    const result = await conn.query(
      `SELECT * FROM read_parquet('${pathId}')`,
    );

    const columns = result.schema.fields.map((f: arrow.Field) => f.name);
    const numRows = result.numRows;
    const row0Frame = getRow0Frame(columns, result);

    const behavNames = new Set<string>();
    for (const name of columns) {
      const parsed = parseTuple2(name);
      if (parsed) behavNames.add(parsed[0]);
    }

    const allBouts: Bout[] = [];

    for (const behav of behavNames) {
      const predNew = columns.find((c: string) => c === `${behav}__pred`);
      const actualNew = columns.find((c: string) => c === `${behav}__actual`);
      const predOld = columns.find((c: string) => c === `('${behav}', 'pred')`);
      const actualOld = columns.find((c: string) => c === `('${behav}', 'actual')`);
      const predName = predNew ?? predOld ?? null;
      const actualName = actualNew ?? actualOld ?? null;
      const hasPred = predName !== null;
      const hasActual = actualName !== null;

      if (!hasActual && !hasPred) continue;

      let actuals: Int8Array;

      if (hasActual && hasPred) {
        const preds = Int8Array.from(
          result.getChild(predName)!.toArray() as number[],
        );
        const oldActuals = Int8Array.from(
          result.getChild(actualName)!.toArray() as number[],
        );
        actuals = migrateActual(preds, oldActuals);
      } else if (hasPred && !hasActual) {
        const preds = Int8Array.from(
          result.getChild(predName)!.toArray() as number[],
        );
        actuals = new Int8Array(numRows);
        for (let i = 0; i < numRows; i++) {
          actuals[i] = preds[i] === 1 ? UNSURE : 0;
        }
      } else {
        actuals = Int8Array.from(
          result.getChild(actualName!)!.toArray() as number[],
        );
      }

      const userDefCols = new Map<string, Int8Array>();
      for (const name of columns) {
        const parsed = parseTuple2(name);
        if (
          parsed &&
          parsed[0] === behav &&
          parsed[1] !== "actual" &&
          parsed[1] !== "pred"
        ) {
          userDefCols.set(
            parsed[1],
            Int8Array.from(result.getChild(name)!.toArray() as number[]),
          );
        }
      }

      allBouts.push(...framesToBouts(actuals, behav, userDefCols, row0Frame));
    }

    allBouts.sort((a, b) => a.start - b.start || a.behav.localeCompare(b.behav));
    allBouts.forEach((b, i) => {
      b.id = i;
    });

    await db.dropFile(pathId);
    return { bouts: allBouts, numFrames: row0Frame + numRows };
  } finally {
    await conn.close();
  }
}

export async function loadKeypointsParquet(
  buffer: Uint8Array,
  pcutoff: number,
): Promise<{ keypointDefs: KeypointDef[]; keypointFrames: KeypointFrame[] }> {
  const db = await getDuckDB();
  const conn = await db.connect();

  try {
    const pathId = `kpts_${Date.now()}.parquet`;
    await db.registerFileBuffer(pathId, buffer);
    const result = await conn.query(
      `SELECT * FROM read_parquet('${pathId}')`,
    );

    const columns = result.schema.fields.map((f: arrow.Field) => f.name);
    const row0Frame = getRow0Frame(columns, result);
    const kptCols = parseKptColumns(columns);

    if (kptCols.length === 0) {
      await db.dropFile(pathId);
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
    const indivColorMap = new Map(indivs.map((ind, i) => [ind, indivColors[i]]));

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
      const vec = result.getChild(arrowName)!.toArray();
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

    await db.dropFile(pathId);
    return { keypointDefs, keypointFrames };
  } finally {
    await conn.close();
  }
}

export async function loadFeatureColumns(
  buffer: Uint8Array,
): Promise<string[]> {
  const db = await getDuckDB();
  const conn = await db.connect();

  try {
    const pathId = `feat_${Date.now()}.parquet`;
    await db.registerFileBuffer(pathId, buffer);
    const result = await conn.query(
      `SELECT * FROM read_parquet('${pathId}') LIMIT 1`,
    );
    await db.dropFile(pathId);
    return result.schema.fields.map((f: arrow.Field) => f.name);
  } finally {
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

  try {
    const pathId = `featd_${Date.now()}.parquet`;
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

    await db.dropFile(pathId);
    return data;
  } finally {
    await conn.close();
  }
}

export async function saveBehavParquet(
  originalBuffer: Uint8Array,
  bouts: Bout[],
): Promise<Uint8Array> {
  const db = await getDuckDB();
  const conn = await db.connect();

  try {
    const inId = `save_in_${Date.now()}.parquet`;
    const outId = `save_out_${Date.now()}.parquet`;
    await db.registerFileBuffer(inId, originalBuffer);

    const colsResult = await conn.query(
      `SELECT * FROM read_parquet('${inId}') LIMIT 0`,
    );
    const originalColumns = colsResult.schema.fields.map(
      (f: arrow.Field) => f.name,
    );

    const row0Result = await conn.query(
      `SELECT * FROM read_parquet('${inId}') LIMIT 1`,
    );
    const row0Frame = getRow0Frame(originalColumns, row0Result);

    await conn.query(
      `CREATE TABLE data AS SELECT * FROM read_parquet('${inId}')`,
    );

    const countResult = await conn.query(`SELECT count(*) as n FROM data`);
    const totalRows = Number(countResult.getChild("n")!.get(0));

    for (const bout of bouts) {
      const startRow = bout.start - row0Frame;
      const stopRow = Math.min(bout.stop - row0Frame, totalRows - 1);
      if (startRow < 0 || startRow > stopRow) continue;

      const actualColName = `"${bout.behav}__actual"`;
      const oldActualColName = `"('${bout.behav}', 'actual')"`;

      const hasNew = originalColumns.includes(`${bout.behav}__actual`);
      const hasOld = originalColumns.includes(
        `('${bout.behav}', 'actual')`,
      );

      if (!hasNew && !hasOld) {
        await conn.query(
          `ALTER TABLE data ADD COLUMN ${actualColName} TINYINT DEFAULT 0`,
        );
      }

      const targetCol = hasNew
        ? actualColName
        : hasOld
          ? oldActualColName
          : actualColName;
      await conn.query(
        `UPDATE data SET ${targetCol} = ${bout.actual} WHERE rowid BETWEEN ${startRow + 1} AND ${stopRow + 1}`,
      );

      for (const [udKey, udValue] of Object.entries(bout.userDefined)) {
        const udColName = `"${bout.behav}__${udKey}"`;
        const oldUdColName = `"('${bout.behav}', '${udKey}')"`;

        const hasUdNew = originalColumns.includes(`${bout.behav}__${udKey}`);
        const hasUdOld = originalColumns.includes(
          `('${bout.behav}', '${udKey}')`,
        );

        if (!hasUdNew && !hasUdOld) {
          await conn.query(
            `ALTER TABLE data ADD COLUMN ${udColName} TINYINT DEFAULT 0`,
          );
        }

        const targetUdCol = hasUdNew
          ? udColName
          : hasUdOld
            ? oldUdColName
            : udColName;
        await conn.query(
          `UPDATE data SET ${targetUdCol} = ${udValue} WHERE rowid BETWEEN ${startRow + 1} AND ${stopRow + 1}`,
        );
      }
    }

    const dropCols: string[] = [];
    for (const name of originalColumns) {
      const parsed = parseTuple2(name);
      if (parsed && parsed[1] === "pred") {
        dropCols.push(`"${name}"`);
      }
    }
    if (dropCols.length > 0) {
      await conn.query(`ALTER TABLE data DROP COLUMN ${dropCols.join(", ")}`);
    }

    await conn.query(
      `COPY data TO '${outId}' (FORMAT PARQUET, COMPRESSION ZSTD)`,
    );

    const exported = await db.copyFileToBuffer(outId);

    await db.dropFile(inId);
    await db.dropFile(outId);
    dropCols.length = 0;

    return exported;
  } finally {
    await conn.close();
  }
}
