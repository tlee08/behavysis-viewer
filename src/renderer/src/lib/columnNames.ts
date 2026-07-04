export function parseTuple4(
  s: string,
): [string, string, string, string] | null {
  const m = s.match(
    /^\(\s*'(.+?)'\s*,\s*'(.+?)'\s*,\s*'(.+?)'\s*,\s*'(.+?)'\s*\)$/,
  );
  return m ? [m[1], m[2], m[3], m[4]] : null;
}

const COORDS = new Set(["x", "y", "likelihood"]);

export interface KptColumn {
  arrowName: string;
  indiv: string;
  bpt: string;
  coord: "x" | "y" | "likelihood";
}

export function parseKptColumns(columnNames: string[]): KptColumn[] {
  const result: KptColumn[] = [];
  for (const name of columnNames) {
    const t4 = parseTuple4(name);
    if (t4 && COORDS.has(t4[3])) {
      result.push({
        arrowName: name,
        indiv: t4[1],
        bpt: t4[2],
        coord: t4[3] as KptColumn["coord"],
      });
    }
  }
  return result;
}
