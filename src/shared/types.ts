// Types shared between main process (parsing via nodejs-polars)
// and renderer process (Zustand store + UI components).

// 1=TRUE_POS (model bout, reviewer confirms IS behaviour)
// -1=FALSE_POS (model bout, reviewer says NOT behaviour)
// 0=TRUE_NEG (no bout — gap between bouts)
// -2=UNSURE (model bout, not reviewed yet)
export type ActualValue = -2 | -1 | 0 | 1;

export const TRUE_POS = 1 satisfies ActualValue;
export const FALSE_POS = -1 satisfies ActualValue;
export const TRUE_NEG = 0 satisfies ActualValue;
export const UNSURE = -2 satisfies ActualValue;

export const ACTUAL_COLORS: Record<ActualValue, string> = {
  [TRUE_POS]: "#22c55e", // green  — IS behaviour
  [FALSE_POS]: "#ef4444", // red    — NOT behaviour
  [TRUE_NEG]: "#6b7280", // gray   — not a bout
  [UNSURE]: "#eab308", // yellow — unreviewed
};

export interface Bout {
  id: number; // index in the bouts array (reassigned on every parse)
  start: number; // first frame (inclusive)
  stop: number; // last frame (inclusive)
  behav: string;
  actual: ActualValue;
  userDefined: Record<string, ActualValue>;
}

// A single keypoint on a given frame
export interface KeypointEntry {
  x: number;
  y: number;
  likelihood: number;
}

// All keypoints for one frame, keyed by `${indiv}_${bpt}`
export type KeypointFrame = Record<string, KeypointEntry>;

export interface KeypointDef {
  key: string; // `${indiv}_${bpt}`
  indiv: string;
  bpt: string;
  color: string; // hex
}

export interface AppConfig {
  fps: number;
  numFrames: number;
  startFrame: number;
  keypointPcutoff: number;
  keypointRadius: number;
  widthPx: number;
  heightPx: number;
}

export interface ExperimentPaths {
  configPath: string;
  videoPath: string;
  behavsPath: string;
  keypointsPath: string;
  featuresPath: string;
  name: string;
}
