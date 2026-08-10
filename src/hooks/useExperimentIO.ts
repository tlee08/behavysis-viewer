import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readFile, readTextFile, writeFile } from "@tauri-apps/plugin-fs";
import { load as yamlLoad } from "js-yaml";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveExperimentPaths } from "../lib/fileManager";
import { FrameReader, type FrameMetadata } from "../lib/frameReader";
import {
  loadBehavParquet,
  loadKeypointsParquet,
  saveBehavParquet,
} from "../lib/parquetIO";
import {
  parseExperimentConfig,
  parseMetadata,
} from "../shared/behavysisContract";
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
    classifyBehaviour,
    loadExperiment,
    setVideoMetadata,
    setFeatureSets,
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

      const [metadataText, configText] = await Promise.all([
        readTextFile(expPaths.metadataPath),
        readTextFile(expPaths.configPath),
      ]);
      const rawMetadata = yamlLoad(metadataText) as Record<string, unknown>;
      const rawConfig = yamlLoad(configText) as Record<string, unknown>;
      const appConfig = parseMetadata(rawMetadata);
      const expConfig = parseExperimentConfig(rawConfig);

      const featureSets: string[] = [];
      try {
        const entries = await readDir(expPaths.featuresDir);
        featureSets.push(
          ...entries
            .filter((e) => e.isDirectory)
            .map((e) => e.name)
            .sort(),
        );
      } catch (err) {
        console.warn("Cannot list features dir:", String(err));
      }

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
        parsedBouts = await loadBehavParquet(
          new Uint8Array(behavBytes),
          expConfig.classifyBehaviour,
        );
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

      loadExperiment(
        expPaths,
        appConfig,
        newReader.metadata.totalFrames,
        parsedBouts,
        keypoints,
        expConfig.classifyBehaviour,
        featureSets,
      );

      setFeatureSets(featureSets);
      setStatus(`Opened: ${expPaths.name}`);
    } catch (err) {
      setStatus(`Error: ${String(err)}`);
    }
  }, [loadExperiment, setVideoMetadata, setFeatureSets]);

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
        classifyBehaviour,
      );
      await writeFile(paths.behavsPath, updatedBuffer);
      setStatus(`Saved → ${paths.behavsPath}`);
    } catch (err) {
      setStatus(`Save failed: ${String(err)}`);
    }
  }, [paths, config, bouts, classifyBehaviour]);

  return { reader, metadata, status, open: openExperiment, save };
}
