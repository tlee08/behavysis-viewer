import { create } from "zustand";
import type { ColorMapName, ColorMode } from "./lib/colors";
import type { FrameMetadata } from "./lib/frameReader";
import type {
  ActualValue,
  AppConfig,
  Bout,
  ExperimentPaths,
  FileDiagnostic,
  KeypointData,
  PredictedData,
} from "./shared/types";

interface AppState {
  paths: ExperimentPaths | null;
  config: AppConfig | null;
  videoMetadata: FrameMetadata | null;
  numFrames: number;
  bouts: Bout[];
  keypoints: KeypointData | null;

  currentFrame: number;
  isPlaying: boolean;
  vidSpeed: number;
  focusSizeSeconds: number;

  showVideo: boolean;
  showKeypoints: boolean;
  keypointPcutoff: number;
  keypointRadius: number;
  keypointColorMode: ColorMode;
  keypointColorMap: ColorMapName;
  jumpSeconds: number;
  graphWindowSeconds: number;

  featureColumns: string[];
  selectedFeatureColumns: string[];
  featureData: Record<string, Float64Array>;
  featureYGlobal: boolean;
  featureScaleMode: "raw" | "minmax" | "zscore";
  featureSets: string[];
  activeFeatureSet: string | null;
  classifyBehaviour: Record<string, string[]>;

  selectedBehaviours: string[];
  predicted: PredictedData | null;
  diagnostics: FileDiagnostic[];

  selectedBoutId: number | null;

  loadExperiment: (
    paths: ExperimentPaths,
    config: AppConfig,
    numFrames: number,
    bouts: Bout[],
    keypoints: KeypointData | null,
    classifyBehaviour: Record<string, string[]>,
    featureSets: string[],
  ) => void;

  setCurrentFrame: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVidSpeed: (speed: number) => void;
  setVideoMetadata: (meta: FrameMetadata | null) => void;
  setFocusSizeSeconds: (n: number) => void;
  setShowVideo: (show: boolean) => void;
  setShowKeypoints: (show: boolean) => void;
  setKeypointPcutoff: (pcutoff: number) => void;
  setKeypointRadius: (radius: number) => void;
  setKeypointColorMode: (mode: ColorMode) => void;
  setKeypointColorMap: (map: ColorMapName) => void;
  setJumpSeconds: (seconds: number) => void;
  setGraphWindowSeconds: (seconds: number) => void;

  setFeatureColumns: (columns: string[]) => void;
  setSelectedFeatureColumns: (columns: string[]) => void;
  setFeatureData: (data: Record<string, Float64Array>) => void;
  setFeatureYGlobal: (v: boolean) => void;
  setFeatureScaleMode: (mode: "raw" | "minmax" | "zscore") => void;
  setFeatureSets: (sets: string[]) => void;
  setActiveFeatureSet: (name: string | null) => void;
  setClassifyBehaviour: (cb: Record<string, string[]>) => void;

  setSelectedBehaviours: (behaviours: string[]) => void;
  setPredicted: (data: PredictedData | null) => void;
  setDiagnostics: (diagnostics: FileDiagnostic[]) => void;

  selectBout: (id: number | null) => void;
  interimBoutEdit: {
    boutId: number;
    start: number;
    stop: number;
  } | null;
  setInterimBoutEdit: (
    edit: { boutId: number; start: number; stop: number } | null,
  ) => void;
  updateBoutActual: (id: number, actual: ActualValue) => void;
  updateBoutUserDefined: (id: number, key: string, value: ActualValue) => void;
  updateBoutRange: (id: number, start: number, stop: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  paths: null,
  config: null,
  videoMetadata: null,
  numFrames: 0,
  bouts: [],
  keypoints: null,

  currentFrame: 0,
  isPlaying: false,
  vidSpeed: 1,
  focusSizeSeconds: 1.5,

  showVideo: true,
  showKeypoints: false,
  keypointPcutoff: 0.8,
  keypointRadius: 5,
  keypointColorMode: "individual",
  keypointColorMap: "hue",
  jumpSeconds: 5,
  graphWindowSeconds: 10,

  featureColumns: [],
  selectedFeatureColumns: [],
  featureData: {},
  featureYGlobal: false,
  featureScaleMode: "minmax",
  featureSets: [],
  activeFeatureSet: null,
  classifyBehaviour: {},

  selectedBehaviours: [],
  predicted: null,
  diagnostics: [],

  selectedBoutId: null,

  loadExperiment: (
    paths,
    config,
    numFrames,
    bouts,
    keypoints,
    classifyBehaviour,
    featureSets,
  ) => {
    set({
      paths,
      config,
      numFrames,
      bouts,
      keypoints,
      classifyBehaviour,
      featureSets,
      currentFrame: 0,
      selectedBoutId: null,
      featureColumns: [],
      selectedFeatureColumns: [],
      featureData: {},
      activeFeatureSet: null,
      selectedBehaviours: [],
      predicted: null,
      diagnostics: [],
    });
  },

  setCurrentFrame: (currentFrame) => set({ currentFrame }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVidSpeed: (vidSpeed) => set({ vidSpeed }),
  setVideoMetadata: (videoMetadata) => set({ videoMetadata }),
  setFocusSizeSeconds: (focusSizeSeconds) => set({ focusSizeSeconds }),
  setShowVideo: (showVideo) => set({ showVideo }),
  setShowKeypoints: (showKeypoints) => set({ showKeypoints }),
  setKeypointPcutoff: (keypointPcutoff) => set({ keypointPcutoff }),
  setKeypointRadius: (keypointRadius) => set({ keypointRadius }),
  setKeypointColorMode: (keypointColorMode) => set({ keypointColorMode }),
  setKeypointColorMap: (keypointColorMap) => set({ keypointColorMap }),
  setJumpSeconds: (jumpSeconds) => set({ jumpSeconds }),
  setGraphWindowSeconds: (graphWindowSeconds) => set({ graphWindowSeconds }),

  setFeatureColumns: (featureColumns) => set({ featureColumns }),
  setSelectedFeatureColumns: (selectedFeatureColumns) =>
    set({ selectedFeatureColumns }),
  setFeatureData: (featureData) => set({ featureData }),
  setFeatureYGlobal: (featureYGlobal) => set({ featureYGlobal }),
  setFeatureScaleMode: (featureScaleMode) => set({ featureScaleMode }),
  setFeatureSets: (featureSets) => set({ featureSets }),
  setActiveFeatureSet: (activeFeatureSet) =>
    set({ activeFeatureSet, selectedFeatureColumns: [], featureData: {} }),
  setClassifyBehaviour: (classifyBehaviour) => set({ classifyBehaviour }),

  setSelectedBehaviours: (selectedBehaviours) => set({ selectedBehaviours }),
  setPredicted: (predicted) => set({ predicted }),
  setDiagnostics: (diagnostics) => set({ diagnostics }),

  selectBout: (selectedBoutId) => {
    if (selectedBoutId === null) {
      set({ selectedBoutId: null, interimBoutEdit: null });
      return;
    }
    const bout = get().bouts.find((b) => b.id === selectedBoutId);
    set({
      selectedBoutId,
      interimBoutEdit: bout
        ? { boutId: bout.id, start: bout.start, stop: bout.stop }
        : null,
    });
  },

  interimBoutEdit: null,
  setInterimBoutEdit: (interimBoutEdit) => set({ interimBoutEdit }),

  updateBoutActual: (id, actual) =>
    set((s) => ({
      bouts: s.bouts.map((b) => (b.id === id ? { ...b, actual } : b)),
    })),

  updateBoutUserDefined: (id, key, value) =>
    set((s) => ({
      bouts: s.bouts.map((b) =>
        b.id === id
          ? { ...b, userDefined: { ...b.userDefined, [key]: value } }
          : b,
      ),
    })),

  updateBoutRange: (id, start, stop) =>
    set((s) => ({
      bouts: s.bouts.map((b) =>
        b.id === id
          ? {
              ...b,
              start: Math.max(0, start),
              stop: Math.min(s.numFrames - 1, Math.max(start, stop)),
            }
          : b,
      ),
    })),
}));

export function getBoutById(id: number): Bout | undefined {
  return useStore.getState().bouts.find((b) => b.id === id);
}
