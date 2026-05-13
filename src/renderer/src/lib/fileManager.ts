import type { ExperimentPaths } from "../../shared/types";

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
    behavsPath: joinFn(root, "7_scored_behavs", `${name}.parquet`),
    keypointsPath: joinFn(root, "4_preprocessed", `${name}.parquet`),
  };
}

export function parseAppConfig(raw: Record<string, unknown>): {
  fps: number;
  keypointPcutoff: number;
  keypointRadius: number;
  widthPx: number;
  heightPx: number;
} {
  const auto: any = raw.auto ?? {};
  const user: any = raw.user ?? {};
  const formatVid: any = user.format_vid ?? {};
  const evaluateVid: any = user.evaluate_vid ?? {};
  const autoFormattedVid: any = auto.formatted_vid ?? {};

  return {
    fps: Number(autoFormattedVid.fps ?? formatVid.fps ?? 15),
    keypointPcutoff: Number(evaluateVid.pcutoff ?? 0.6),
    keypointRadius: Number(evaluateVid.radius ?? 5),
    widthPx: Number(autoFormattedVid.width_px ?? formatVid.width_px ?? 640),
    heightPx: Number(autoFormattedVid.height_px ?? formatVid.height_px ?? 480),
  };
}
