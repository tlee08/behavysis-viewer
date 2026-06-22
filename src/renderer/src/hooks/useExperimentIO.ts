import { useCallback, useEffect, useRef, useState } from "react";
import type { Bout, KeypointDef, KeypointFrame } from "../../shared/types";
import { parseAppConfig, resolveExperimentPaths } from "../lib/fileManager";
import { useStore } from "../store";

export function useExperimentIO() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState(
    "Open a config JSON to begin  (File > Open)",
  );
  const blobUrlRef = useRef<string | null>(null);

  const { paths, bouts, loadExperiment } = useStore();

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const open = useCallback(async () => {
    const configPath = await window.electron.openFile([
      { name: "Config file", extensions: ["json", "yaml"] },
    ]);
    if (!configPath) return;

    try {
      setStatus("Loading…");
      const expPaths = resolveExperimentPaths(configPath);
      const rawConfig = (await window.electron.readJson(configPath)) as Record<
        string,
        unknown
      >;
      const appConfig = parseAppConfig(rawConfig);

      const videoBytes = await window.electron.readFile(expPaths.videoPath);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const blob = new Blob([videoBytes], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setVideoUrl(url);

      let parsedBouts: Bout[] = [];
      try {
        const result = await window.electron.parseBehav(expPaths.behavsPath);
        parsedBouts = result.bouts;
      } catch {
        // Behavs file absent — no bouts
      }

      let keypointDefs: KeypointDef[] = [];
      let keypointFrames: KeypointFrame[] = [];
      try {
        const parsed = await window.electron.parseKeypoints(
          expPaths.keypointsPath,
          appConfig.keypointPcutoff,
        );
        keypointDefs = parsed.keypointDefs;
        keypointFrames = parsed.keypointFrames;
      } catch {
        // Keypoints file absent — silently skip
      }

      loadExperiment(
        expPaths,
        appConfig,
        appConfig.numFrames,
        parsedBouts,
        keypointDefs,
        keypointFrames,
      );
      setStatus(`Opened: ${expPaths.name}`);
    } catch (err) {
      setStatus(`Error: ${String(err)}`);
    }
  }, [loadExperiment]);

  const save = useCallback(async () => {
    if (!paths) {
      setStatus("Nothing to save");
      return;
    }
    try {
      await window.electron.saveBehav(paths.behavsPath, bouts);
      setStatus(`Saved → ${paths.behavsPath}`);
    } catch (err) {
      setStatus(`Save failed: ${String(err)}`);
    }
  }, [paths, bouts]);

  return { videoUrl, status, open, save };
}
