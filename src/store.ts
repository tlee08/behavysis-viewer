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
import { TRUE_POS } from "./shared/types";

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const round1 = (n: number) => Math.round(n * 10) / 10;

const sortBouts = (bouts: Bout[]) =>
  [...bouts].sort(
    (a, b) => a.start - b.start || a.behav.localeCompare(b.behav),
  );

const maxBoutId = (bouts: Bout[]) =>
  bouts.reduce((m, b) => Math.max(m, b.id), -1);

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
  skipUnit: "seconds" | "frames";
  jumpFrames: number;
  graphWindowSeconds: number;
  zoom: number;

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
  filterBehaviours: string[];
  durFrames: number;

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
  setSkipUnit: (unit: "seconds" | "frames") => void;
  setJumpFrames: (frames: number) => void;
  setGraphWindowSeconds: (seconds: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

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
  setFilterBehaviours: (behaviours: string[]) => void;
  setDurFrames: (frames: number) => void;
  splitBout: (id: number, frame: number) => void;
  deleteBout: (id: number) => void;
  addBout: (behav: string, start: number, stop: number) => void;
  interimBoutEdit: {
    boutId: number;
    start: number;
    stop: number;
  } | null;
  setInterimBoutEdit: (
    edit: { boutId: number; start: number; stop: number } | null,
  ) => void;
  updateBoutActual: (id: number, actual: ActualValue) => void;
  updateBoutSubBehaviour: (id: number, key: string, value: ActualValue) => void;
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
  skipUnit: "seconds",
  jumpFrames: 5,
  graphWindowSeconds: 10,
  zoom: 1,

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
  filterBehaviours: [],
  durFrames: 50,

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
      filterBehaviours: [],
      durFrames: Math.round(config.fps),
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
  setSkipUnit: (skipUnit) => set({ skipUnit }),
  setJumpFrames: (jumpFrames) => set({ jumpFrames }),
  setGraphWindowSeconds: (graphWindowSeconds) => set({ graphWindowSeconds }),
  zoomIn: () =>
    set((s) => ({ zoom: Math.min(ZOOM_MAX, round1(s.zoom + ZOOM_STEP)) })),
  zoomOut: () =>
    set((s) => ({ zoom: Math.max(ZOOM_MIN, round1(s.zoom - ZOOM_STEP)) })),
  resetZoom: () => set({ zoom: 1 }),

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

  setFilterBehaviours: (filterBehaviours) => set({ filterBehaviours }),
  setDurFrames: (durFrames) => set({ durFrames }),

  splitBout: (id, frame) =>
    set((s) => {
      const bout = s.bouts.find((b) => b.id === id);
      if (!bout || frame <= bout.start || frame >= bout.stop) return {};
      const right: Bout = {
        id: maxBoutId(s.bouts) + 1,
        start: frame + 1,
        stop: bout.stop,
        behav: bout.behav,
        actual: bout.actual,
        subBehaviour: { ...bout.subBehaviour },
      };
      return {
        bouts: sortBouts([
          ...s.bouts.map((b) => (b.id === id ? { ...b, stop: frame } : b)),
          right,
        ]),
        interimBoutEdit: null,
      };
    }),

  deleteBout: (id) =>
    set((s) => ({
      bouts: s.bouts.filter((b) => b.id !== id),
      selectedBoutId: s.selectedBoutId === id ? null : s.selectedBoutId,
      interimBoutEdit:
        s.interimBoutEdit?.boutId === id ? null : s.interimBoutEdit,
    })),

  addBout: (behav, start, stop) =>
    set((s) => {
      const clampedStart = Math.max(0, Math.round(start));
      const clampedStop = Math.min(
        s.numFrames - 1,
        Math.max(clampedStart, Math.round(stop)),
      );
      const subs = s.classifyBehaviour[behav] ?? [];
      const subBehaviour: Record<string, ActualValue> = {};
      for (const sub of subs) subBehaviour[sub] = 0;
      const bout: Bout = {
        id: maxBoutId(s.bouts) + 1,
        start: clampedStart,
        stop: clampedStop,
        behav,
        actual: TRUE_POS,
        subBehaviour,
      };
      return {
        bouts: sortBouts([...s.bouts, bout]),
        selectedBoutId: bout.id,
        interimBoutEdit: {
          boutId: bout.id,
          start: bout.start,
          stop: bout.stop,
        },
      };
    }),

  interimBoutEdit: null,
  setInterimBoutEdit: (interimBoutEdit) => set({ interimBoutEdit }),

  updateBoutActual: (id, actual) =>
    set((s) => ({
      bouts: s.bouts.map((b) => (b.id === id ? { ...b, actual } : b)),
    })),

  updateBoutSubBehaviour: (id, key, value) =>
    set((s) => ({
      bouts: s.bouts.map((b) =>
        b.id === id
          ? { ...b, subBehaviour: { ...b.subBehaviour, [key]: value } }
          : b,
      ),
    })),

  updateBoutRange: (id, start, stop) =>
    set((s) => ({
      bouts: sortBouts(
        s.bouts.map((b) =>
          b.id === id
            ? {
                ...b,
                start: Math.max(0, start),
                stop: Math.min(s.numFrames - 1, Math.max(start, stop)),
              }
            : b,
        ),
      ),
    })),
}));

export function getBoutById(id: number): Bout | undefined {
  return useStore.getState().bouts.find((b) => b.id === id);
}

export function filterBoutsByBehaviour(
  bouts: Bout[],
  behaviours: string[],
): Bout[] {
  if (behaviours.length === 0) return bouts;
  const set = new Set(behaviours);
  return bouts.filter((b) => set.has(b.behav));
}

export function getSkipFrames(fps: number): number {
  const s = useStore.getState();
  return s.skipUnit === "frames"
    ? s.jumpFrames
    : Math.round(s.jumpSeconds * fps);
}

export function boutsOverlap(
  bouts: Bout[],
  behav: string,
  start: number,
  stop: number,
  excludeId?: number,
): boolean {
  return bouts.some(
    (b) =>
      b.id !== excludeId &&
      b.behav === behav &&
      start <= b.stop &&
      b.start <= stop,
  );
}
