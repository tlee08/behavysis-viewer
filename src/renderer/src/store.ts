import { create } from "zustand";
import type {
  ActualValue,
  AppConfig,
  Bout,
  ExperimentPaths,
  KeypointDef,
  KeypointFrame,
} from "../../shared/types";
import type { FrameMetadata } from "./lib/frameReader";

interface AppState {
  paths: ExperimentPaths | null;
  config: AppConfig | null;
  videoMetadata: FrameMetadata | null;
  numFrames: number;
  bouts: Bout[];
  keypointDefs: KeypointDef[];
  keypointFrames: KeypointFrame[];

  currentFrame: number;
  isPlaying: boolean;
  vidSpeed: number;
  focusSizeSeconds: number;

  showVideo: boolean;
  showKeypoints: boolean;
  jumpSeconds: number;
  graphWindowSeconds: number;

  featureColumns: string[];
  selectedFeatureColumns: string[];
  featureData: Record<string, Float64Array>;
  featureYGlobal: boolean;
  featureScaleMode: "raw" | "minmax" | "zscore";

  selectedBoutId: number | null;

  loadExperiment: (
    paths: ExperimentPaths,
    config: AppConfig,
    numFrames: number,
    bouts: Bout[],
    keypointDefs: KeypointDef[],
    keypointFrames: KeypointFrame[],
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
  setJumpSeconds: (seconds: number) => void;
  setGraphWindowSeconds: (seconds: number) => void;

  setFeatureColumns: (columns: string[]) => void;
  setSelectedFeatureColumns: (columns: string[]) => void;
  setFeatureData: (data: Record<string, Float64Array>) => void;
  setFeatureYGlobal: (v: boolean) => void;
  setFeatureScaleMode: (mode: "raw" | "minmax" | "zscore") => void;

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
  keypointDefs: [],
  keypointFrames: [],

  currentFrame: 0,
  isPlaying: false,
  vidSpeed: 1,
  focusSizeSeconds: 1.5,

  showVideo: true,
  showKeypoints: false,
  jumpSeconds: 5,
  graphWindowSeconds: 10,

  featureColumns: [],
  selectedFeatureColumns: [],
  featureData: {},
  featureYGlobal: false,
  featureScaleMode: "minmax",

  selectedBoutId: null,

  loadExperiment: (
    paths,
    config,
    numFrames,
    bouts,
    keypointDefs,
    keypointFrames,
  ) => {
    set({
      paths,
      config,
      numFrames,
      bouts,
      keypointDefs,
      keypointFrames,
      currentFrame: 0,
      selectedBoutId: null,
      featureColumns: [],
      selectedFeatureColumns: [],
      featureData: {},
    });
  },

  setCurrentFrame: (currentFrame) => set({ currentFrame }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVidSpeed: (vidSpeed) => set({ vidSpeed }),
  setVideoMetadata: (videoMetadata) => set({ videoMetadata }),
  setFocusSizeSeconds: (focusSizeSeconds) => set({ focusSizeSeconds }),
  setShowVideo: (showVideo) => set({ showVideo }),
  setShowKeypoints: (showKeypoints) => set({ showKeypoints }),
  setKeypointPcutoff: (keypointPcutoff) =>
    set((s) => ({
      config: s.config ? { ...s.config, keypointPcutoff } : null,
    })),
  setKeypointRadius: (keypointRadius) =>
    set((s) => ({
      config: s.config ? { ...s.config, keypointRadius } : null,
    })),
  setJumpSeconds: (jumpSeconds) => set({ jumpSeconds }),
  setGraphWindowSeconds: (graphWindowSeconds) => set({ graphWindowSeconds }),

  setFeatureColumns: (featureColumns) => set({ featureColumns }),
  setSelectedFeatureColumns: (selectedFeatureColumns) =>
    set({ selectedFeatureColumns }),
  setFeatureData: (featureData) => set({ featureData }),
  setFeatureYGlobal: (featureYGlobal) => set({ featureYGlobal }),
  setFeatureScaleMode: (featureScaleMode) => set({ featureScaleMode }),

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
