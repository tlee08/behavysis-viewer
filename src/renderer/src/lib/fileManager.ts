import type { ExperimentPaths } from '../../shared/types'

const sep = (p: string) => (p.includes('\\') ? '\\' : '/')
const dirnameFn = (p: string) => { const s = sep(p); const i = p.lastIndexOf(s); return i >= 0 ? p.slice(0, i) : '.' }
const basenameFn = (p: string) => { const s = sep(p); return p.slice(p.lastIndexOf(s) + 1) }
const joinFn = (...parts: string[]) => { const s = sep(parts[0] ?? '/'); return parts.join(s) }
const stripExt = (name: string) => name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name

export function resolveExperimentPaths(configPath: string): ExperimentPaths {
  const name = stripExt(basenameFn(configPath))
  const root = dirnameFn(dirnameFn(configPath))

  return {
    configPath,
    name,
    videoPath: joinFn(root, '2_formatted_vid', `${name}.mp4`),
    behavsPath: joinFn(root, '7_scored_behavs', `${name}.parquet`),
    keypointsPath: joinFn(root, '4_preprocessed', `${name}.parquet`),
  }
}

export function parseAppConfig(raw: Record<string, unknown>): {
  fps: number
  keypointPcutoff: number
  keypointRadius: number
} {
  const auto = (raw.auto ?? {}) as Record<string, unknown>
  const user = (raw.user ?? {}) as Record<string, unknown>
  const formatVid = (user.format_vid ?? {}) as Record<string, unknown>
  const evaluateVid = (user.evaluate_vid ?? {}) as Record<string, unknown>
  const autoFormattedVid = (auto.formatted_vid ?? {}) as Record<string, unknown>

  const fps = Number(autoFormattedVid.fps ?? formatVid.fps ?? 15)
  const widthPx = Number(autoFormattedVid.width_px ?? formatVid.width_px ?? 640)
  const heightPx = Number(autoFormattedVid.height_px ?? formatVid.height_px ?? 480)

  return {
    fps,
    keypointPcutoff: Number(evaluateVid.pcutoff ?? 0.6),
    keypointRadius: Number(evaluateVid.radius ?? 5),
    widthPx,
    heightPx,
  }
}
