import { create } from "zustand";
import type { FrameMetadata } from "./lib/frameReader";
import type {
  Bout,
  AppConfig,
  ExperimentPaths,
  KeypointFrame,
  KeypointDef,
  ActualValue,
} from "../../shared/types";

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
  focusSizeFrames: number;

  showKeypoints: boolean;
  jumpSeconds: number;
  graphWindowSeconds: number;

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
  setFocusSizeFrames: (n: number) => void;
  setShowKeypoints: (show: boolean) => void;
  setKeypointPcutoff: (pcutoff: number) => void;
  setKeypointRadius: (radius: number) => void;
  setJumpSeconds: (seconds: number) => void;
  setGraphWindowSeconds: (seconds: number) => void;

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
  focusSizeFrames: 5,

  showKeypoints: false,
  jumpSeconds: 5,
  graphWindowSeconds: 10,

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
    });
  },

  setCurrentFrame: (currentFrame) => set({ currentFrame }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVidSpeed: (vidSpeed) => set({ vidSpeed }),
  setVideoMetadata: (videoMetadata) => set({ videoMetadata }),
  setFocusSizeFrames: (focusSizeFrames) => set({ focusSizeFrames }),
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
