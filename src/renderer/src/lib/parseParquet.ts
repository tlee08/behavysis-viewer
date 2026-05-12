/**
 * Parquet parsing for Behavysis pipeline files.
 *
 * BEHAVIOUR DF (7_scored_behavs/{name}.parquet)
 *   Written by pandas with a 2-level MultiIndex on columns:
 *     Level 0: behaviour name  (e.g. "attack")
 *     Level 1: column name     ("actual" or a user-defined sub-behaviour key)
 *   In the parquet/Arrow schema, column names are stored as Python tuple strings:
 *     e.g.  "('attack', 'actual')"  or  "('attack', 'chase')"
 *   Row index = frame number (guaranteed by the pipeline).
 *
 * KEYPOINTS DF (4_preprocessed/{name}.parquet)
 *   Written by pandas with a 4-level MultiIndex (DLC format):
 *     Level 0: scorer     Level 1: individual
 *     Level 2: bodypart   Level 3: coord (x | y | likelihood)
 *   In the parquet/Arrow schema:  "('DLC_scorer', 'mouse1', 'Nose', 'x')"
 *   Flat column names are also accepted:  "mouse1_Nose_x"
 */

import { tableFromIPC, tableToIPC, tableFromArrays, Table } from 'apache-arrow'
import type { Bout, KeypointDef, KeypointFrame } from '../types'
import { framesToBouts } from './bouts'
import { generateColors } from './colors'

// Lazy-loaded on first use to avoid WASM initialisation crashing the renderer at startup
let _parquetMod: typeof import('parquet-wasm') | null = null

async function getParquetMod(): Promise<typeof import('parquet-wasm')> {
  if (!_parquetMod) {
    const mod = await import('parquet-wasm')
    if (typeof (mod as any).default === 'function') await (mod as any).default()
    _parquetMod = mod
  }
  return _parquetMod
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Parse a Python 2-level tuple string → [a, b] or null. */
function parseTuple2(s: string): [string, string] | null {
  const m = s.match(/^\(\s*'(.+?)'\s*,\s*'(.+?)'\s*\)$/)
  return m ? [m[1], m[2]] : null
}

/** Parse a Python 4-level tuple string → [a, b, c, d] or null. */
function parseTuple4(s: string): [string, string, string, string] | null {
  const m = s.match(/^\(\s*'(.+?)'\s*,\s*'(.+?)'\s*,\s*'(.+?)'\s*,\s*'(.+?)'\s*\)$/)
  return m ? [m[1], m[2], m[3], m[4]] : null
}

/** Convert a parquet Uint8Array into an apache-arrow Table. */
async function toArrowTable(parquetBytes: Uint8Array): Promise<Table> {
  const mod = await getParquetMod()
  const wasmTable = mod.readParquet(parquetBytes)
  const ipcStream = wasmTable.intoIPCStream()
  return tableFromIPC(ipcStream)
}

/** Read a numeric value from an Arrow column cell (handles bigint). */
function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'bigint') return Number(val)
  return Number(val)
}

/** Detect pandas DataFrame index column and return the frame number of the first row. */
function getRow0Frame(table: Table): number {
  for (const name of ['__index_level_0__', 'frame']) {
    const idxCol = table.getChild(name)
    if (idxCol) return toNumber(idxCol.get(0))
  }
  return 0
}

// ─── behaviour DF ─────────────────────────────────────────────────────────────

interface BehavColumn {
  arrowName: string
  behav: string
  col: string // "actual" or a user-defined key
}

const SKIP_COLS = new Set(['pred'])

/** Group Arrow schema fields into behaviour columns. */
function parseBehavColumns(table: Table): BehavColumn[] {
  const result: BehavColumn[] = []
  for (const field of table.schema.fields) {
    const parsed = parseTuple2(field.name)
    if (parsed && !SKIP_COLS.has(parsed[1])) {
      result.push({ arrowName: field.name, behav: parsed[0], col: parsed[1] })
    }
  }
  return result
}

/** Build a per-frame map  frame → behav → {actual, userDefined}  from the Arrow table. */
function buildFrameMap(
  table: Table,
  behavCols: BehavColumn[],
): Map<string, { actual: number; userDefined: Record<string, number> }>[] {
  const numRows = table.numRows
  const frames: Map<string, { actual: number; userDefined: Record<string, number> }>[] = Array.from(
    { length: numRows },
    () => new Map(),
  )

  // Build column vectors once for performance
  const vectors = new Map<string, unknown[]>()
  for (const { arrowName } of behavCols) {
    if (!vectors.has(arrowName)) {
      const col = table.getChild(arrowName)
      vectors.set(arrowName, col ? Array.from(col) : [])
    }
  }

  // Collect unique behaviour names to pre-init the per-frame entries
  const behaviours = [...new Set(behavCols.map((c) => c.behav))]

  for (let i = 0; i < numRows; i++) {
    for (const behav of behaviours) {
      frames[i].set(behav, { actual: 0, userDefined: {} })
    }
    for (const { arrowName, behav, col } of behavCols) {
      const val = toNumber(vectors.get(arrowName)?.[i])
      const entry = frames[i].get(behav)!
      if (col === 'actual') {
        entry.actual = val
      } else {
        entry.userDefined[col] = val
      }
    }
  }

  return frames
}

/**
 * Parse the behaviour scored parquet.
 * Returns bouts (derived via run-length encoding) and the raw table for saving.
 */
export async function parseBehavParquet(parquetBytes: Uint8Array): Promise<{
  bouts: Bout[]
  numFrames: number
  rawTable: Table
}> {
  const table = await toArrowTable(parquetBytes)
  const row0Frame = getRow0Frame(table)
  const behavCols = parseBehavColumns(table)
  if (behavCols.length === 0) {
    return { bouts: [], numFrames: row0Frame + table.numRows, rawTable: table }
  }
  const frameMap = buildFrameMap(table, behavCols)
  const behavNames = [...new Set(behavCols.map((c) => c.behav))]

  // Build pred map: one Int8Array per behaviour
  const predByBehav = new Map<string, Int8Array>()
  for (const behav of behavNames) {
    const predCol = table.getChild(`('${behav}', 'pred')`)
    if (predCol) predByBehav.set(behav, Int8Array.from(predCol, (v) => toNumber(v)))
  }

  const bouts = framesToBouts(frameMap, behavNames, predByBehav)
  if (row0Frame !== 0) {
    for (const b of bouts) {
      b.start += row0Frame
      b.stop += row0Frame
    }
  }
  return { bouts, numFrames: row0Frame + table.numRows, rawTable: table }
}

// ─── keypoints DF ─────────────────────────────────────────────────────────────

interface KptColumn {
  arrowName: string
  indiv: string
  bpt: string
  coord: 'x' | 'y' | 'likelihood'
}

const COORDS = new Set(['x', 'y', 'likelihood'])

/** Detect and parse keypoint columns in either 4-tuple or flat format. */
function parseKptColumns(table: Table): KptColumn[] {
  const result: KptColumn[] = []
  for (const field of table.schema.fields) {
    // 4-level DLC tuple: "('scorer', 'indiv', 'bpt', 'coord')"
    const t4 = parseTuple4(field.name)
    if (t4 && COORDS.has(t4[3])) {
      result.push({ arrowName: field.name, indiv: t4[1], bpt: t4[2], coord: t4[3] as KptColumn['coord'] })
      continue
    }
    // Flat: "indiv_bpt_coord"  (coord is the last segment)
    const parts = field.name.split('_')
    if (parts.length >= 3 && COORDS.has(parts[parts.length - 1])) {
      const coord = parts[parts.length - 1] as KptColumn['coord']
      const bpt = parts[parts.length - 2]
      const indiv = parts.slice(0, -2).join('_')
      result.push({ arrowName: field.name, indiv, bpt, coord })
    }
  }
  return result
}

/**
 * Parse the keypoints parquet.
 * Returns per-frame keypoint data and definitions (for rendering).
 */
export async function parseKeypointsParquet(
  parquetBytes: Uint8Array,
  pcutoff: number,
): Promise<{ keypointDefs: KeypointDef[]; keypointFrames: KeypointFrame[] }> {
  const table = await toArrowTable(parquetBytes)
  const row0Frame = getRow0Frame(table)
  const kptCols = parseKptColumns(table)
  if (kptCols.length === 0) return { keypointDefs: [], keypointFrames: [] }

  // Unique keypoint identifiers, preserving order of first appearance
  const seen = new Set<string>()
  const kptKeys: { key: string; indiv: string; bpt: string }[] = []
  for (const { indiv, bpt } of kptCols) {
    const key = `${indiv}_${bpt}`
    if (!seen.has(key)) {
      seen.add(key)
      kptKeys.push({ key, indiv, bpt })
    }
  }

  // Assign colours: one per individual (or per keypoint if preferred)
  const indivs = [...new Set(kptKeys.map((k) => k.indiv))]
  const indivColors = generateColors(indivs.length)
  const indivColorMap = new Map(indivs.map((ind, i) => [ind, indivColors[i]]))

  const keypointDefs: KeypointDef[] = kptKeys.map(({ key, indiv, bpt }) => ({
    key,
    indiv,
    bpt,
    color: indivColorMap.get(indiv) ?? '#ffffff',
  }))

  // Build per-frame data
  const vectors = new Map<string, unknown[]>()
  for (const { arrowName } of kptCols) {
    if (!vectors.has(arrowName)) {
      const col = table.getChild(arrowName)
      vectors.set(arrowName, col ? Array.from(col) : [])
    }
  }

  const numRows = table.numRows
  const totalFrames = row0Frame + numRows
  const keypointFrames: KeypointFrame[] = Array.from({ length: totalFrames }, () => ({}))

  for (const { arrowName, indiv, bpt, coord } of kptCols) {
    const vec = vectors.get(arrowName)!
    const key = `${indiv}_${bpt}`
    for (let i = 0; i < numRows; i++) {
      const frameIdx = row0Frame + i
      if (!keypointFrames[frameIdx][key]) {
        keypointFrames[frameIdx][key] = { x: 0, y: 0, likelihood: 0 }
      }
      keypointFrames[frameIdx][key][coord] = toNumber(vec[i])
    }
  }

  // Zero out entries below pcutoff so the overlay skips them
  for (let i = row0Frame; i < totalFrames; i++) {
    for (const kpt of kptKeys) {
      const e = keypointFrames[i][kpt.key]
      if (e && e.likelihood < pcutoff) {
        keypointFrames[i][kpt.key] = { x: 0, y: 0, likelihood: 0 }
      }
    }
  }

  return { keypointDefs, keypointFrames }
}

// ─── saving ───────────────────────────────────────────────────────────────────

/**
 * Serialise current bouts back to the original parquet format.
 * Reconstructs the per-frame column values from the bouts,
 * then writes them into a copy of the original Arrow table before
 * re-encoding as parquet.
 *
 * NOTE: this preserves the original column names (including any pandas
 * MultiIndex tuple strings), so the Python pipeline can read it back.
 */
export async function boutsToBehavParquet(bouts: Bout[], rawTable: Table): Promise<Uint8Array> {
  const mod = await getParquetMod()
  const numRows = rawTable.numRows
  const row0Frame = getRow0Frame(rawTable)

  // Start from original column data to preserve non-bout frames (including pred)
  const newColumns: Record<string, Int8Array> = {}
  for (const field of rawTable.schema.fields) {
    const col = rawTable.getChild(field.name)
    if (col) {
      newColumns[field.name] = Int8Array.from(col, (v) => toNumber(v))
    } else {
      newColumns[field.name] = new Int8Array(numRows)
    }
  }

  for (const bout of bouts) {
    const startRow = bout.start - row0Frame
    const stopRow = bout.stop - row0Frame
    for (let f = startRow; f <= Math.min(stopRow, numRows - 1); f++) {
      for (const field of rawTable.schema.fields) {
        const parsed = parseTuple2(field.name)
        if (!parsed || parsed[0] !== bout.behav) continue
        if (parsed[1] === 'actual') {
          newColumns[field.name][f] = bout.actual
        } else if (parsed[1] in bout.userDefined) {
          newColumns[field.name][f] = bout.userDefined[parsed[1]]
        }
      }
    }
  }

  const table = tableFromArrays(newColumns)
  const arrowIpc = tableToIPC(table, 'stream')
  const wasmTable = mod.Table.fromIPCStream(arrowIpc)
  return mod.writeParquet(wasmTable)
}
