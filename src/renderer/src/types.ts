declare global {
  interface Window {
    electron: import("../../preload").ElectronAPI
  }
}

// -1 = unsure/unreviewed, 0 = not behaviour, 1 = is behaviour
export type ActualValue = -1 | 0 | 1

export interface Bout {
  id: number         // index in the bouts array (stable across saves)
  start: number      // first frame (inclusive)
  stop: number       // last frame (inclusive)
  behav: string
  actual: ActualValue
  userDefined: Record<string, ActualValue>
}

// A single keypoint on a given frame
export interface KeypointEntry {
  x: number
  y: number
  likelihood: number
}

// All keypoints for one frame, keyed by `${indiv}_${bpt}`
export type KeypointFrame = Record<string, KeypointEntry>

export interface KeypointDef {
  key: string    // `${indiv}_${bpt}`
  indiv: string
  bpt: string
  color: string  // hex
}

// A named series of per-frame scalar values — used for extra graph panes.
// values[frameNum] = scalar (NaN if missing).
export interface GraphSeries {
  label: string
  color: string
  values: Float32Array
}

export interface AppConfig {
  fps: number
  keypointPcutoff: number
  keypointRadius: number
}

export interface ExperimentPaths {
  configPath: string
  videoPath: string
  behavsPath: string
  keypointsPath: string
  name: string
}

// Colour for each actual value
export const ACTUAL_COLORS: Record<ActualValue, string> = {
  1: '#22c55e',   // green  — IS behaviour
  0: '#ef4444',   // red    — NOT behaviour
  [-1]: '#eab308', // yellow — unsure
}
