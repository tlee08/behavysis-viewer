// Re-export shared types for backward-compatible imports.
// All types now live in src/shared/types.ts which is accessible
// from both main and renderer processes.
export type {
  Bout,
  KeypointDef,
  KeypointFrame,
  KeypointEntry,
  GraphSeries,
  ActualValue,
  AppConfig,
  ExperimentPaths,
} from '../../shared/types'

export { ACTUAL_COLORS } from '../../shared/types'

declare global {
  interface Window {
    electron: import("../../preload").ElectronAPI
  }
}
