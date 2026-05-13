import pl from "nodejs-polars";
import { parseTuple2 } from "./columnNames";
import { getRow0Frame } from "./parquetUtils";
import type { Bout, ActualValue } from "../../shared/types";

interface BehavColumn {
  arrowName: string;
  behav: string;
  col: string; // "actual" or a user-defined key
}

/** Group column names into behaviour columns, skipping 'pred'. */
function parseBehavColumns(columnNames: string[]): BehavColumn[] {
  const result: BehavColumn[] = [];
  for (const name of columnNames) {
    const parsed = parseTuple2(name);
    if (parsed && parsed[1] !== "pred") {
      result.push({ arrowName: name, behav: parsed[0], col: parsed[1] });
    }
  }
  return result;
}

function clampActual(v: number): ActualValue {
  if (v >= 1) return 1;
  if (v <= -1) return -1;
  return 0;
}

function framesToBouts(
  preds: Int8Array,
  behav: string,
  actuals: Int8Array,
  userDefCols: Map<string, Int8Array>,
  offset: number,
): Bout[] {
  const bouts: Bout[] = [];
  const numFrames = preds.length;

  const pushBout = (startRow: number, stopRow: number) => {
    const userDefined: Record<string, number> = {};
    for (const [key, vec] of userDefCols) {
      userDefined[key] = vec[startRow];
    }
    bouts.push({
      id: 0,
      start: startRow + offset,
      stop: stopRow + offset,
      behav,
      actual: clampActual(actuals[startRow]),
      userDefined: Object.fromEntries(
        Object.entries(userDefined).map(([k, v]) => [k, clampActual(v)]),
      ),
    });
  };

  let runStart = -1;
  for (let i = 0; i < numFrames; i++) {
    if (preds[i] === 1 && runStart === -1) {
      runStart = i;
    } else if (preds[i] === 0 && runStart !== -1) {
      pushBout(runStart, i - 1);
      runStart = -1;
    }
  }

  if (runStart !== -1) pushBout(runStart, numFrames - 1);

  return bouts;
}

/**
 * Parse the behaviour scored parquet into bouts.
 * Reads the file with nodejs-polars and extracts bouts via run-length encoding
 * on the 'pred' column for each behaviour.
 */
export function parseBehavParquet(path: string): {
  bouts: Bout[];
  numFrames: number;
} {
  const df = pl.readParquet(path);
  const numRows = df.height;
  const row0Frame = getRow0Frame(df);
  const behavCols = parseBehavColumns(df.columns);

  if (behavCols.length === 0) {
    return { bouts: [], numFrames: row0Frame + numRows };
  }

  const allBouts: Bout[] = [];
  const behavNames = [...new Set(behavCols.map((c) => c.behav))];

  for (const behav of behavNames) {
    const predName = `('${behav}', 'pred')`;
    if (!df.columns.includes(predName)) continue;

    const preds = Int8Array.from(df.getColumn(predName).toArray(), (v) =>
      Number(v),
    );
    const actualName = `('${behav}', 'actual')`;
    const actuals = df.columns.includes(actualName)
      ? Int8Array.from(df.getColumn(actualName).toArray(), (v) => Number(v))
      : new Int8Array(numRows);

    const userDefCols = new Map<string, Int8Array>();
    for (const { arrowName, behav: b, col } of behavCols) {
      if (b === behav && col !== "actual") {
        userDefCols.set(
          col,
          Int8Array.from(df.getColumn(arrowName).toArray(), (v) => Number(v)),
        );
      }
    }

    allBouts.push(
      ...framesToBouts(preds, behav, actuals, userDefCols, row0Frame),
    );
  }

  allBouts.sort((a, b) => a.start - b.start || a.behav.localeCompare(b.behav));
  allBouts.forEach((b, i) => {
    b.id = i;
  });

  return { bouts: allBouts, numFrames: row0Frame + numRows };
}
