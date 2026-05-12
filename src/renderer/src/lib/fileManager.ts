import type { ExperimentPaths } from '../types'

// Path utilities that work in the renderer (no Node 'path' module).
// Handles both / and \ separators.
const sep = (p: string) => (p.includes('\\') ? '\\' : '/')
const dirnameFn = (p: string) => { const s = sep(p); const i = p.lastIndexOf(s); return i >= 0 ? p.slice(0, i) : '.' }
const basenameFn = (p: string) => { const s = sep(p); return p.slice(p.lastIndexOf(s) + 1) }
const joinFn = (...parts: string[]) => { const s = sep(parts[0] ?? '/'); return parts.join(s) }
const stripExt = (name: string) => name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name

/**
 * Given the path to a config JSON (0_configs/{name}.json),
 * derive all other experiment file paths — mirrors Python's ExpFileManager.
 */
export function resolveExperimentPaths(configPath: string): ExperimentPaths {
  const name = stripExt(basenameFn(configPath))
  const root = dirnameFn(dirnameFn(configPath)) // two levels up

  return {
    configPath,
    name,
    videoPath: joinFn(root, '2_formatted_vid', `${name}.mp4`),
    behavsPath: joinFn(root, '7_scored_behavs', `${name}.parquet`),
    keypointsPath: joinFn(root, '4_preprocessed', `${name}.parquet`),
  }
}

/**
 * Extract the fields the viewer needs from the raw experiment config JSON.
 * Handles the `--ref_key` indirection used by the Python pipeline.
 */
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

  // Prefer auto-detected fps; fall back to user-set value
  const fps = Number(autoFormattedVid.fps ?? formatVid.fps ?? 15)

  return {
    fps,
    keypointPcutoff: Number(evaluateVid.pcutoff ?? 0.6),
    keypointRadius: Number(evaluateVid.radius ?? 5),
  }
}
