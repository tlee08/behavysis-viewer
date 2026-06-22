import pl from "nodejs-polars";
import type { Bout } from "../../shared/types";
import { parseTuple2 } from "./columnNames";
import { getRow0Frame, toNumber } from "./parquetUtils";

/**
 * Read an existing column in either old `('behav', 'subcol')` or new
 * `behav__subcol` format.  Returns null if the column doesn't exist.
 */
function readColumn(
  df: pl.DataFrame,
  behav: string,
  subcol: string,
): Int8Array | null {
  const newName = `${behav}__${subcol}`;
  if (df.columns.includes(newName)) {
    return Int8Array.from(df.getColumn(newName).toArray(), toNumber);
  }
  const oldName = `('${behav}', '${subcol}')`;
  if (df.columns.includes(oldName)) {
    return Int8Array.from(df.getColumn(oldName).toArray(), toNumber);
  }
  return null;
}

/**
 * Save edited bouts back to the original parquet file (overwrites in-place).
 *
 * Bout existence is stored in the 'actual' column using the new
 * `behav__actual` naming convention.  The 'pred' column is dropped entirely.
 * Old-format column names `('behav', 'col')` are read for backward
 * compatibility but never written.
 */
export function saveBehavParquet(path: string, bouts: Bout[]): void {
  if (bouts.length === 0) return;

  const df = pl.readParquet(path);
  const numRows = df.height;
  const row0Frame = getRow0Frame(df);

  // Track column updates keyed by new-format name (behav__subcol)
  const columnUpdates = new Map<string, Int8Array>();

  for (const bout of bouts) {
    const startRow = bout.start - row0Frame;
    const stopRow = bout.stop - row0Frame;
    const effectiveStop = Math.min(stopRow, numRows - 1);

    // Actual column — start from all zeros (TRUE_NEG), fill bout range
    const actualCol = `${bout.behav}__actual`;
    if (!columnUpdates.has(actualCol)) {
      columnUpdates.set(actualCol, new Int8Array(numRows));
    }
    const actualVec = columnUpdates.get(actualCol)!;
    for (let f = startRow; f <= effectiveStop; f++) {
      actualVec[f] = bout.actual;
    }

    // User-defined columns
    for (const [udKey, udValue] of Object.entries(bout.userDefined)) {
      const udCol = `${bout.behav}__${udKey}`;
      if (!columnUpdates.has(udCol)) {
        columnUpdates.set(
          udCol,
          readColumn(df, bout.behav, udKey) ?? new Int8Array(numRows),
        );
      }
      const udVec = columnUpdates.get(udCol)!;
      for (let f = startRow; f <= effectiveStop; f++) {
        udVec[f] = udValue;
      }
    }
  }

  // Drop all pred columns (both old and new formats)
  let result = df;
  for (const name of df.columns) {
    const parsed = parseTuple2(name);
    if (parsed && parsed[1] === "pred") {
      result = result.drop(name);
    }
  }

  // Replace old/new column variants with new-format columns
  for (const [newName, newValues] of columnUpdates) {
    const parsed = parseTuple2(newName)!;
    const behav = parsed[0];
    const subcol = parsed[1];

    // Drop both old and new format variants if they exist
    const oldName = `('${behav}', '${subcol}')`;
    for (const name of [oldName, newName]) {
      if (result.columns.includes(name)) {
        result = result.drop(name);
      }
    }

    result = result.hstack([
      pl.Series(newName, Array.from(newValues), pl.Int8),
    ]);
  }

  result.writeParquet(path);
}
