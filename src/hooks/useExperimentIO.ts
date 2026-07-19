import { open } from "@tauri-apps/plugin-dialog";
import { readFile, readTextFile, writeFile } from "@tauri-apps/plugin-fs";
import { load as yamlLoad } from "js-yaml";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveExperimentPaths } from "../lib/fileManager";
import { FrameReader, type FrameMetadata } from "../lib/frameReader";
import {
  loadBehavParquet,
  loadFeatureColumns,
  loadKeypointsParquet,
  saveBehavParquet,
} from "../lib/parquetIO";
import { parseMetadata } from "../shared/behavysisContract";
import type { Bout, KeypointData } from "../shared/types";
import { useStore } from "../store";

export function useExperimentIO() {
  const [reader, setReader] = useState<FrameReader | null>(null);
  const [metadata, setMetadata] = useState<FrameMetadata | null>(null);
  const [status, setStatus] = useState(
    "Open a config YAML to begin  (File > Open)",
  );
  const readerRef = useRef<FrameReader | null>(null);

  const {
    paths,
    bouts,
    config,
    loadExperiment,
    setVideoMetadata,
    setFeatureColumns,
  } = useStore();

  useEffect(() => {
    return () => {
      readerRef.current?.close();
    };
  }, []);

  const openExperiment = useCallback(async () => {
    const configPath = await open({
      filters: [{ name: "Config file", extensions: ["yaml"] }],
      multiple: false,
    });
    if (!configPath) return;

    try {
      setStatus("Loading…");
      const expPaths = resolveExperimentPaths(configPath);
      const metadataText = await readTextFile(expPaths.metadataPath);
      const rawMetadata = yamlLoad(metadataText) as Record<string, unknown>;
      const appConfig = parseMetadata(rawMetadata);

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
        parsedBouts = await loadBehavParquet(new Uint8Array(behavBytes));
      } catch (err) {
        console.warn("No behaviour bouts file:", String(err));
      }

      let keypoints: KeypointData | null = null;
      try {
        const kptBytes = await readFile(expPaths.keypointsPath);
        keypoints = await loadKeypointsParquet(new Uint8Array(kptBytes));
      } catch (err) {
        console.warn("No keypoints file:", String(err));
      }

      let featureCols: string[] = [];
      try {
        const featBytes = await readFile(expPaths.featuresPath);
        featureCols = await loadFeatureColumns(new Uint8Array(featBytes));
      } catch (err) {
        console.warn("No features file:", String(err));
      }

      loadExperiment(
        expPaths,
        appConfig,
        newReader.metadata.totalFrames,
        parsedBouts,
        keypoints,
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
