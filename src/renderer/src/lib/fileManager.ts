import type { AppConfig, ExperimentPaths } from "../../../shared/types";

function required(msg: string): never {
  throw new Error(msg);
}

function asObj(v: unknown, path: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null)
    throw new Error(`${path} must be an object`);
  return v as Record<string, unknown>;
}

function getNum(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  if (typeof v !== "number") throw new Error(`"${key}" must be a number`);
  return v;
}

function sep(p: string) {
  return p.includes("\\") ? "\\" : "/";
}

function dirnameFn(p: string) {
  const s = sep(p);
  const i = p.lastIndexOf(s);
  return i >= 0 ? p.slice(0, i) : ".";
}

function basenameFn(p: string) {
  const s = sep(p);
  return p.slice(p.lastIndexOf(s) + 1);
}

function joinFn(...parts: string[]) {
  const s = sep(parts[0] ?? "/");
  return parts.join(s);
}

function stripExt(name: string) {
  return name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
}

export function resolveExperimentPaths(configPath: string): ExperimentPaths {
  const name = stripExt(basenameFn(configPath));
  const root = dirnameFn(dirnameFn(configPath));

  return {
    configPath,
    name,
    videoPath: joinFn(root, "2_formatted_vid", `${name}.mp4`),
    keypointsPath: joinFn(root, "4_preprocessed", `${name}.parquet`),
    featuresPath: joinFn(root, "5_features_extracted", `${name}.parquet`),
    behavsPath: joinFn(root, "7_scored_behavs", `${name}.parquet`),
  };
}

export function parseAppConfig(raw: Record<string, unknown>): AppConfig {
  const auto = asObj(raw.auto ?? required("config missing 'auto'"), "auto");
  const formatted = asObj(
    auto.formatted_vid ?? required("config missing 'auto.formatted_vid'"),
    "auto.formatted_vid",
  );
  const user = asObj(raw.user ?? required("config missing 'user'"), "user");
  const evaluateVid = asObj(
    user.evaluate_vid ?? required("config missing 'user.evaluate_vid'"),
    "user.evaluate_vid",
  );

  return {
    fps: getNum(formatted, "fps"),
    numFrames: getNum(formatted, "total_frames"),
    startFrame: getNum(auto, "start_frame"),
    stopFrame: getNum(auto, "stop_frame"),
    keypointPcutoff: getNum(evaluateVid, "pcutoff"),
    keypointRadius: getNum(evaluateVid, "radius"),
    widthPx: getNum(formatted, "width_px"),
    heightPx: getNum(formatted, "height_px"),
  };
}
