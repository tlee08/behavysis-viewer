// ═══════════════════════════════════════════════════════════════════════════
// MIRROR of the behavysis pipeline data contract.
//
// This is the SINGLE source of truth in behavysis-viewer for anything shared
// with the behavysis Python pipeline: folder layout, DataFrame column names,
// the `actual` scoring enum, and the metadata-file shape.
//
// The pipeline and the viewer are separate git repos installed independently,
// so there is no runtime/relative coupling. When the pipeline contract changes,
// update THIS FILE to match. Mirrored from behavysis:
//   - constants/pipeline.py      → STAGE_DIRS
//   - constants/data_names.py    → COLS, ActualValue enum
//   - schemas/schemas.py         → COLS (KEYPOINTS_SCHEMA, BEHAVIOUR_SCORED_BASE)
//   - models/experiment_metadata.py → ExperimentMetadata / parseMetadata
// ═══════════════════════════════════════════════════════════════════════════

// ─── Pipeline stage directories (constants/pipeline.py) ─────────────────────
export const STAGE_DIRS = {
  config: "0_config",
  metadata: "0_metadata",
  rawVideo: "1_raw_videos",
  formattedVideo: "2_formatted_videos",
  keypoints: "3_keypoints",
  preprocessed: "4_preprocessed",
  featuresExtracted: "5_features_extracted",
  behaviourPredicted: "6_behaviour_predicted",
  behaviourScored: "7_behaviour_scored",
  analysisCombined: "9_analysis_combined",
} as const;

// ─── DataFrame column names (schemas/schemas.py, constants/data_names.py) ────
// KEYPOINTS_SCHEMA: one row per (frame, individual, bodypart).
// BEHAVIOUR_SCORED_BASE: (frame, behaviour, actual) + dynamic user-defined cols.
export const COLS = {
  frame: "frame",
  individual: "individual",
  bodypart: "bodypart",
  x: "x",
  y: "y",
  likelihood: "likelihood",
  behaviour: "behaviour",
  actual: "actual",
} as const;

// ─── `actual` scoring enum (constants/data_names.py) ────────────────────────
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

// ─── Experiment metadata (models/experiment_metadata.py) ────────────────────
// Written by the pipeline as `0_metadata/{name}.json` via model_dump_json.
// Video params (fps, dimensions, frame range) come from here, NOT the config.
export interface ExperimentMetadataFile {
  fps: number;
  numFrames: number;
  startFrame: number;
  stopFrame: number;
  widthPx: number;
  heightPx: number;
}

function asObj(v: unknown, path: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null)
    throw new Error(`metadata ${path} must be an object`);
  return v as Record<string, unknown>;
}

function getNum(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  if (typeof v !== "number")
    throw new Error(`metadata "${key}" must be a number`);
  return v;
}

// Parse `0_metadata/{name}.json` (ExperimentMetadata) into viewer video params.
export function parseMetadata(
  raw: Record<string, unknown>,
): ExperimentMetadataFile {
  const formatted = asObj(raw.formatted_video, "formatted_video");
  return {
    fps: getNum(formatted, "fps"),
    numFrames: getNum(formatted, "total_frames"),
    widthPx: getNum(formatted, "width_px"),
    heightPx: getNum(formatted, "height_px"),
    startFrame: getNum(raw, "start_frame"),
    stopFrame: getNum(raw, "stop_frame"),
  };
}
