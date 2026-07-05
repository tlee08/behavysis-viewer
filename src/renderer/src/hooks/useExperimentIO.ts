import { useCallback, useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile, readTextFile, writeFile } from "@tauri-apps/plugin-fs";
import type { Bout, KeypointDef, KeypointFrame } from "../../../shared/types";
import { parseAppConfig, resolveExperimentPaths } from "../lib/fileManager";
import {
  loadBehavParquet,
  loadKeypointsParquet,
  loadFeatureColumns,
  loadFeatureData,
  saveBehavParquet,
} from "../lib/parquetIO";
import { FrameReader, type FrameMetadata } from "../lib/frameReader";
import { useStore } from "../store";

export function useExperimentIO() {
  const [reader, setReader] = useState<FrameReader | null>(null);
  const [metadata, setMetadata] = useState<FrameMetadata | null>(null);
  const [status, setStatus] = useState(
    "Open a config JSON to begin  (File > Open)",
  );
  const readerRef = useRef<FrameReader | null>(null);

  const { paths, bouts, config, loadExperiment, setVideoMetadata, setFeatureColumns } =
    useStore();

  useEffect(() => {
    return () => {
      readerRef.current?.close();
    };
  }, []);

  const openExperiment = useCallback(async () => {
    const configPath = await open({
      filters: [{ name: "Config file", extensions: ["json", "yaml"] }],
      multiple: false,
    });
    if (!configPath) return;

    try {
      setStatus("Loading…");
      const expPaths = resolveExperimentPaths(configPath);
      const rawText = await readTextFile(configPath);
      const rawConfig = JSON.parse(rawText) as Record<string, unknown>;
      const appConfig = parseAppConfig(rawConfig);

      const videoBytes = await readFile(expPaths.videoPath);
      readerRef.current?.close();
      const arrBuf = new Uint8Array(videoBytes).buffer;
      const newReader = await FrameReader.init(arrBuf);
      readerRef.current = newReader;
      setReader(newReader);
      setMetadata(newReader.metadata);
      setVideoMetadata(newReader.metadata);

      let parsedBouts: Bout[] = [];
      try {
        const behavBytes = await readFile(expPaths.behavsPath);
        const result = await loadBehavParquet(new Uint8Array(behavBytes));
        parsedBouts = result.bouts;
      } catch {
        // No bouts file — start with empty bout list
      }

      let keypointDefs: KeypointDef[] = [];
      let keypointFrames: KeypointFrame[] = [];
      try {
        const kptBytes = await readFile(expPaths.keypointsPath);
        const parsed = await loadKeypointsParquet(
          new Uint8Array(kptBytes),
          appConfig.keypointPcutoff,
        );
        keypointDefs = parsed.keypointDefs;
        keypointFrames = parsed.keypointFrames;
      } catch {
        // Keypoints file absent — silently skip
      }

      let featureCols: string[] = [];
      try {
        const featBytes = await readFile(expPaths.featuresPath);
        featureCols = await loadFeatureColumns(new Uint8Array(featBytes));
      } catch {
        // Features file absent — silently skip
      }

      loadExperiment(
        expPaths,
        appConfig,
        newReader.metadata.totalFrames,
        parsedBouts,
        keypointDefs,
        keypointFrames,
      );

      setFeatureColumns(featureCols);
      setStatus(`Opened: ${expPaths.name}`);
    } catch (err) {
      setStatus(`Error: ${String(err)}`);
    }
  }, [loadExperiment, setVideoMetadata, setFeatureColumns]);

  const save = useCallback(async () => {
    if (!paths || !config) {
      setStatus("Nothing to save");
      return;
    }
    try {
      const updatedBuffer = await saveBehavParquet(
        config.startFrame,
        config.stopFrame,
        bouts,
      );
      await writeFile(paths.behavsPath, updatedBuffer);
      setStatus(`Saved → ${paths.behavsPath}`);
    } catch (err) {
      setStatus(`Save failed: ${String(err)}`);
    }
  }, [paths, config, bouts]);

  return { reader, metadata, status, open: openExperiment, save };
}
