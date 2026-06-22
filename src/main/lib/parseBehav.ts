import { existsSync } from "fs";
import pl from "nodejs-polars";
import type { ActualValue, Bout } from "../../shared/types";
import { UNSURE } from "../../shared/types";
import { parseTuple2 } from "./columnNames";
import { getRow0Frame } from "./parquetUtils";

function clampActual(v: number): ActualValue {
  if (v >= 1) return 1;
  if (v <= -2) return -2;
  if (v === -1) return -1;
  return 0;
}

/** Resolve a column name — tries new `behav__subcol` first, old `('behav', 'subcol')` second. */
function findColumn(
  df: pl.DataFrame,
  behav: string,
  subcol: string,
): string | null {
  const newName = `${behav}__${subcol}`;
  if (df.columns.includes(newName)) return newName;
  const oldName = `('${behav}', '${subcol}')`;
  if (df.columns.includes(oldName)) return oldName;
  return null;
}

/**
 * Migrate old-format (pred + actual -1/0/1) to new-format actual (-2/-1/0/1).
 * Uses pred column to disambiguate old actual=0 (TRUE_NEG vs FALSE_POS) and
 * old actual=-1 (UNSURE → mapped to -2).
 */
function migrateActual(preds: Int8Array, oldActuals: Int8Array): Int8Array {
  const result = new Int8Array(preds.length);
  for (let i = 0; i < preds.length; i++) {
    if (preds[i] === 0) {
      result[i] = 0; // TRUE_NEG — model says no bout
    } else {
      const a = oldActuals[i];
      if (a >= 1)
        result[i] = 1; // TRUE_POS
      else if (a === 0)
        result[i] = -1; // FALSE_POS (old NOT behaviour → model bout rejected)
      else result[i] = -2; // UNSURE (old not-sure value, typically -1)
    }
  }
  return result;
}

/**
 * Create bouts by run-length encoding the actuals array.
 * A run of consecutive frames where actual ≠ 0 becomes a Bout.
 * (TRUE_POS=1, FALSE_POS=-1, UNSURE=-2 all create bouts; only TRUE_NEG=0 is a gap.)
 */
function framesToBouts(
  actuals: Int8Array,
  behav: string,
  userDefCols: Map<string, Int8Array>,
  offset: number,
): Bout[] {
  const bouts: Bout[] = [];
  const numFrames = actuals.length;

  const pushBout = (startRow: number, stopRow: number) => {
    const userDefined: Record<string, ActualValue> = {};
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
    const isBout = actuals[i] !== 0; // TRUE_POS=1, FALSE_POS=-1, UNSURE=-2
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

/**
 * Parse the behaviour parquet file into bouts.
 *
 * Bout existence is determined by the 'actual' column:
 *   actual = 1  (TRUE_POS)   → bout (model bout, reviewer confirmed)
 *   actual = -1 (FALSE_POS)  → bout (model bout, reviewer rejected)
 *   actual = -2 (UNSURE)    → bout (model bout, not reviewed yet)
 *   actual = 0  (TRUE_NEG)   → NOT a bout (gap between bouts)
 *
 * If a legacy 'pred' column is present, it is used to migrate old -1/0/1
 * actual values to the new -2/-1/0/1 scheme.  After migration, the pred
 * column is ignored.
 */
export function parseBehavParquet(path: string): {
  bouts: Bout[];
  numFrames: number;
} {
  if (!existsSync(path)) return { bouts: [], numFrames: 0 };

  const df = pl.readParquet(path);
  const numRows = df.height;
  const row0Frame = getRow0Frame(df);

  // Discover behaviour names from column names
  const behavNames = new Set<string>();
  for (const name of df.columns) {
    const parsed = parseTuple2(name);
    if (parsed) behavNames.add(parsed[0]);
  }

  const allBouts: Bout[] = [];

  for (const behav of behavNames) {
    const predName = findColumn(df, behav, "pred");
    const actualName = findColumn(df, behav, "actual");
    const hasPred = predName !== null;
    const hasActual = actualName !== null;

    if (!hasActual && !hasPred) continue;

    let actuals: Int8Array;

    if (hasActual && hasPred) {
      // Old format: migrate actual values using pred for disambiguation
      const preds = Int8Array.from(df.getColumn(predName).toArray(), (v) =>
        Number(v),
      );
      const oldActuals = Int8Array.from(
        df.getColumn(actualName!).toArray(),
        (v) => Number(v),
      );
      actuals = migrateActual(preds, oldActuals);
    } else if (hasPred && !hasActual) {
      // Old format: only pred, no actual — derive actual from pred
      const preds = Int8Array.from(df.getColumn(predName).toArray(), (v) =>
        Number(v),
      );
      actuals = new Int8Array(numRows);
      for (let i = 0; i < numRows; i++) {
        actuals[i] = preds[i] === 1 ? UNSURE : 0;
      }
    } else {
      // New format: actual column exists, no pred
      actuals = Int8Array.from(df.getColumn(actualName!).toArray(), (v) =>
        Number(v),
      );
    }

    // User-defined columns (everything except 'actual' and 'pred')
    const userDefCols = new Map<string, Int8Array>();
    for (const name of df.columns) {
      const parsed = parseTuple2(name);
      if (
        parsed &&
        parsed[0] === behav &&
        parsed[1] !== "actual" &&
        parsed[1] !== "pred"
      ) {
        userDefCols.set(
          parsed[1],
          Int8Array.from(df.getColumn(name).toArray(), (v) => Number(v)),
        );
      }
    }

    allBouts.push(...framesToBouts(actuals, behav, userDefCols, row0Frame));
  }

  allBouts.sort((a, b) => a.start - b.start || a.behav.localeCompare(b.behav));
  allBouts.forEach((b, i) => {
    b.id = i;
  });

  return { bouts: allBouts, numFrames: row0Frame + numRows };
}
