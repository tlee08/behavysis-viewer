/**
 * Parse pandas MultiIndex column names stored as Python tuple strings
 * inside the parquet/Arrow schema.
 *
 * Behaviour DF (2-level):  "('attack', 'actual')"
 * Keypoints DF (4-level):  "('DLC_scorer', 'mouse1', 'Nose', 'x')"
 */

/** Parse a 2-level Python tuple string → [a, b] or null. */
export function parseTuple2(s: string): [string, string] | null {
  const m = s.match(/^\(\s*'(.+?)'\s*,\s*'(.+?)'\s*\)$/)
  return m ? [m[1], m[2]] : null
}

/** Parse a 4-level Python tuple string → [a, b, c, d] or null. */
export function parseTuple4(s: string): [string, string, string, string] | null {
  const m = s.match(/^\(\s*'(.+?)'\s*,\s*'(.+?)'\s*,\s*'(.+?)'\s*,\s*'(.+?)'\s*\)$/)
  return m ? [m[1], m[2], m[3], m[4]] : null
}

const COORDS = new Set(['x', 'y', 'likelihood'])

export interface KptColumn {
  arrowName: string
  indiv: string
  bpt: string
  coord: 'x' | 'y' | 'likelihood'
}

/** Extract keypoint column metadata from 4-level tuple column names. */
export function parseKptColumns(columnNames: string[]): KptColumn[] {
  const result: KptColumn[] = []
  for (const name of columnNames) {
    const t4 = parseTuple4(name)
    if (t4 && COORDS.has(t4[3])) {
      result.push({ arrowName: name, indiv: t4[1], bpt: t4[2], coord: t4[3] as KptColumn['coord'] })
    }
  }
  return result
}
