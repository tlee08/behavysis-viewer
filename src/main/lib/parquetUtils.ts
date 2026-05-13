import pl from "nodejs-polars";

const INDEX_COLUMNS = new Set(["__index_level_0__", "frame"]);

export function getRow0Frame(df: pl.DataFrame): number {
  for (const name of INDEX_COLUMNS) {
    if (df.columns.includes(name)) {
      return Number(df.getColumn(name).get(0));
    }
  }
  return 0;
}

export function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "bigint") return Number(v);
  return Number(v);
}
