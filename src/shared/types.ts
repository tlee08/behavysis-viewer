// Viewer-only types for parquet I/O (hyparquet) and UI components.
// Contract shared with the behavysis pipeline lives in ./behavysisContract.ts.

import type { ActualValue } from "./behavysisContract";

export type { ActualValue } from "./behavysisContract";
export {
  ACTUAL_COLORS,
  FALSE_POS,
  TRUE_NEG,
  TRUE_POS,
  UNSURE,
} from "./behavysisContract";

export interface Bout {
  id: number; // index in the bouts array (reassigned on every parse)
  start: number; // first frame (inclusive)
  stop: number; // last frame (inclusive)
  behav: string;
  actual: ActualValue;
  userDefined: Record<string, ActualValue>;
}

export interface KeypointDef {
  indiv: string;
  bpt: string;
  color: string; // hex
}

// Columnar keypoints indexed by absolute frame.
// x[d][frame], y[d][frame], likelihood[d][frame] align with defs[d].
export interface KeypointData {
  numFrames: number;
  defs: KeypointDef[];
  x: Float32Array[];
  y: Float32Array[];
  likelihood: Float32Array[];
}

export interface AppConfig {
  fps: number;
  numFrames: number;
  startFrame: number;
  stopFrame: number;
  widthPx: number;
  heightPx: number;
}

export interface ExperimentPaths {
  configPath: string;
  videoPath: string;
  metadataPath: string;
  behavsPath: string;
  keypointsPath: string;
  featuresPath: string;
  name: string;
}
