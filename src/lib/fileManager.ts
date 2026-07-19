import { STAGE_DIRS } from "../shared/behavysisContract";
import type { ExperimentPaths } from "../shared/types";

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

// User selects the experiment's config yaml in `0_config/`; all other paths
// are inferred relative to the project root (the config dir's parent).
export function resolveExperimentPaths(configPath: string): ExperimentPaths {
  const name = stripExt(basenameFn(configPath));
  const root = dirnameFn(dirnameFn(configPath));

  return {
    configPath,
    name,
    metadataPath: joinFn(root, STAGE_DIRS.metadata, `${name}.yaml`),
    videoPath: joinFn(root, STAGE_DIRS.formattedVideo, `${name}.mp4`),
    keypointsPath: joinFn(root, STAGE_DIRS.preprocessed, `${name}.parquet`),
    featuresPath: joinFn(root, STAGE_DIRS.featuresExtracted, `${name}.parquet`),
    behavsPath: joinFn(root, STAGE_DIRS.behaviourScored, `${name}.parquet`),
  };
}
