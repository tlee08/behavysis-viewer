import { existsSync } from "fs";
import pl from "nodejs-polars";

export function getFeatureColumns(path: string): string[] {
  if (!existsSync(path)) return [];
  const df = pl.readParquet(path);
  return df.columns;
}

export function getFeatureData(
  path: string,
  columns: string[],
): Record<string, Float64Array> {
  if (!existsSync(path) || columns.length === 0) return {};

  const df = pl.readParquet(path);
  const result: Record<string, Float64Array> = {};

  for (const col of columns) {
    const arr = df.getColumn(col).toArray();
    result[col] = Float64Array.from(arr, Number);
  }

  return result;
}
