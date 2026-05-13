import pl from 'nodejs-polars'
import { parseKptColumns } from './columnNames'
import type { KptColumn } from './columnNames'
import { generateColors } from './colors'
import { getRow0Frame, toNumber } from './parquetUtils'
import type { KeypointDef, KeypointFrame } from '../../shared/types'

/**
 * Parse the keypoints parquet file.
 * Only supports 4-level DLC tuple column names:
 *   ("('DLC_scorer', 'mouse1', 'Nose', 'x')", etc.)
 */
export function parseKeypointsParquet(
  path: string,
  pcutoff: number,
): { keypointDefs: KeypointDef[]; keypointFrames: KeypointFrame[] } {
  const df = pl.readParquet(path)
  const row0Frame = getRow0Frame(df)
  const kptCols = parseKptColumns(df.columns)

  if (kptCols.length === 0) {
    return { keypointDefs: [], keypointFrames: [] }
  }

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

  // Assign colours: one per individual
  const indivs = [...new Set(kptKeys.map((k) => k.indiv))]
  const indivColors = generateColors(indivs.length)
  const indivColorMap = new Map(indivs.map((ind, i) => [ind, indivColors[i]]))

  const keypointDefs: KeypointDef[] = kptKeys.map(({ key, indiv, bpt }) => ({
    key,
    indiv,
    bpt,
    color: indivColorMap.get(indiv) ?? '#ffffff',
  }))

  // Pre-extract column vectors
  const vectors = new Map<string, number[]>()
  for (const { arrowName } of kptCols) {
    if (!vectors.has(arrowName)) {
      vectors.set(arrowName, df.getColumn(arrowName).toArray().map(toNumber))
    }
  }

  const numRows = df.height
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
      keypointFrames[frameIdx][key][coord] = vec[i]
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
