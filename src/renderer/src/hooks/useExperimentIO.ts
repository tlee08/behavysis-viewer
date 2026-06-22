import { useCallback, useEffect, useRef, useState } from "react";
import type { Bout, KeypointDef, KeypointFrame } from "../../shared/types";
import { parseAppConfig, resolveExperimentPaths } from "../lib/fileManager";
import { FrameReader, type FrameMetadata } from "../lib/frameReader";
import { useStore } from "../store";

export function useExperimentIO() {
  const [reader, setReader] = useState<FrameReader | null>(null);
  const [metadata, setMetadata] = useState<FrameMetadata | null>(null);
  const [status, setStatus] = useState(
    "Open a config JSON to begin  (File > Open)",
  );
  const readerRef = useRef<FrameReader | null>(null);

  const { paths, bouts, loadExperiment, setVideoMetadata } = useStore();

  useEffect(() => {
    return () => {
      readerRef.current?.close();
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

      // Load and decode video via WebCodecs
      const videoBytes = await window.electron.readFile(expPaths.videoPath);
      readerRef.current?.close();
      const arrBuf = new Uint8Array(videoBytes).buffer;
      const newReader = await FrameReader.init(arrBuf);
      readerRef.current = newReader;
      setReader(newReader);
      setMetadata(newReader.metadata);
      setVideoMetadata(newReader.metadata);

      let parsedBouts: Bout[] = [];
      try {
        const result = await window.electron.parseBehav(expPaths.behavsPath);
        parsedBouts = result.bouts;
      } catch {
        // No bouts file — start with empty bout list
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
        newReader.metadata.totalFrames,
        parsedBouts,
        keypointDefs,
        keypointFrames,
      );
      setStatus(`Opened: ${expPaths.name}`);
    } catch (err) {
      setStatus(`Error: ${String(err)}`);
    }
  }, [loadExperiment, setVideoMetadata]);

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

  return { reader, metadata, status, open, save };
}
