import pl from 'nodejs-polars'
import { parseTuple2 } from './columnNames'
import { getRow0Frame, toNumber } from './parquetUtils'
import type { Bout } from '../../shared/types'

/**
 * Save edited bouts back to the original parquet file (overwrites in-place).
 *
 * Reads the original file to preserve all columns (including 'pred' and any
 * user-defined columns), then applies bout edits to the 'actual' and
 * user-defined columns before writing back.
 */
export function saveBehavParquet(path: string, bouts: Bout[]): void {
  if (bouts.length === 0) return

  const df = pl.readParquet(path)
  const numRows = df.height
  const row0Frame = getRow0Frame(df)

  // Track which columns need updating and build new values
  const columnUpdates = new Map<string, Int8Array>()

  for (const bout of bouts) {
    const startRow = bout.start - row0Frame
    const stopRow = bout.stop - row0Frame
    const effectiveStop = Math.min(stopRow, numRows - 1)

    // Actual column
    const actualCol = `('${bout.behav}', 'actual')`
    if (!columnUpdates.has(actualCol)) {
      columnUpdates.set(
        actualCol,
        df.columns.includes(actualCol)
          ? Int8Array.from(df.getColumn(actualCol).toArray(), toNumber)
          : new Int8Array(numRows),
      )
    }
    const actualVec = columnUpdates.get(actualCol)!
    for (let f = startRow; f <= effectiveStop; f++) {
      actualVec[f] = bout.actual
    }

    // User-defined columns
    for (const [udKey, udValue] of Object.entries(bout.userDefined)) {
      const udCol = `('${bout.behav}', '${udKey}')`
      if (!columnUpdates.has(udCol)) {
        columnUpdates.set(
          udCol,
          df.columns.includes(udCol)
            ? Int8Array.from(df.getColumn(udCol).toArray(), toNumber)
            : new Int8Array(numRows),
        )
      }
      const udVec = columnUpdates.get(udCol)!
      for (let f = startRow; f <= effectiveStop; f++) {
        udVec[f] = udValue
      }
    }
  }

  // Apply column updates: drop old, add new Series
  let result = df
  for (const [colName, newValues] of columnUpdates) {
    result = result.drop(colName)
    result = result.hstack([pl.Series(colName, Array.from(newValues), pl.Int8)])
  }

  result.writeParquet(path)
}
