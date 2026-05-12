import { create } from 'zustand'
import type { Bout, AppConfig, ExperimentPaths, KeypointFrame, GraphSeries, KeypointDef, ActualValue } from './types'

interface AppState {
  // ── Loaded data ──────────────────────────────────────────────────────────
  paths: ExperimentPaths | null
  config: AppConfig | null
  numFrames: number
  bouts: Bout[]
  keypointDefs: KeypointDef[]
  keypointFrames: KeypointFrame[]  // index = frame number
  graphSeries: GraphSeries[]       // additional scrolling data panes

  // ── Video playback ────────────────────────────────────────────────────────
  currentFrame: number
  isPlaying: boolean
  vidSpeed: number         // playback rate multiplier
  visibleRange: [number, number] // [startFrame, endFrame] of the visible window
  focusSizeFrames: number  // padding around bout in focus mode

  // ── Display ───────────────────────────────────────────────────────────────
  showKeypoints: boolean
  focusBout: boolean       // pause at end of selected bout

  // ── Selection ─────────────────────────────────────────────────────────────
  selectedBoutId: number | null

  // ── Actions ───────────────────────────────────────────────────────────────
  loadExperiment: (
    paths: ExperimentPaths,
    config: AppConfig,
    numFrames: number,
    bouts: Bout[],
    keypointDefs: KeypointDef[],
    keypointFrames: KeypointFrame[],
  ) => void

  setCurrentFrame: (frame: number) => void
  setIsPlaying: (playing: boolean) => void
  setVidSpeed: (speed: number) => void
  setVisibleRange: (range: [number, number]) => void
  panToFrame: (frame: number) => void
  setFocusSizeFrames: (n: number) => void
  setShowKeypoints: (show: boolean) => void
  setFocusBout: (focus: boolean) => void

  selectBout: (id: number | null) => void
  updateBoutActual: (id: number, actual: ActualValue) => void
  updateBoutUserDefined: (id: number, key: string, value: ActualValue) => void

  // Extensibility: add a scrolling series (e.g. mouse speed)
  addGraphSeries: (series: GraphSeries) => void
}

const centerVisibleRange = (frame: number, s: AppState): [number, number] => {
  const half = Math.floor((s.visibleRange[1] - s.visibleRange[0]) / 2)
  return [Math.max(0, frame - half), Math.min(s.numFrames - 1, frame + half)]
}

export const useStore = create<AppState>((set) => ({
  paths: null,
  config: null,
  numFrames: 0,
  bouts: [],
  keypointDefs: [],
  keypointFrames: [],
  graphSeries: [],

  currentFrame: 0,
  isPlaying: false,
  vidSpeed: 1,
  visibleRange: [0, 50],
  focusSizeFrames: 5,

  showKeypoints: false,
  focusBout: false,

  selectedBoutId: null,

  loadExperiment: (paths, config, numFrames, bouts, keypointDefs, keypointFrames) =>
    set({ paths, config, numFrames, bouts, keypointDefs, keypointFrames, currentFrame: 0, selectedBoutId: null }),

  setCurrentFrame: (frame) =>
    set((s) => ({ currentFrame: frame, visibleRange: centerVisibleRange(frame, s) })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVidSpeed: (vidSpeed) => set({ vidSpeed }),
  setVisibleRange: (visibleRange) => set({ visibleRange }),
  panToFrame: (frame) =>
    set((s) => ({
      currentFrame: frame,
      visibleRange: centerVisibleRange(frame, s),
    })),
  setFocusSizeFrames: (focusSizeFrames) => set({ focusSizeFrames }),
  setShowKeypoints: (showKeypoints) => set({ showKeypoints }),
  setFocusBout: (focusBout) => set({ focusBout }),

  selectBout: (selectedBoutId) => set({ selectedBoutId }),

  updateBoutActual: (id, actual) =>
    set((s) => ({
      bouts: s.bouts.map((b) => (b.id === id ? { ...b, actual } : b)),
    })),

  updateBoutUserDefined: (id, key, value) =>
    set((s) => ({
      bouts: s.bouts.map((b) =>
        b.id === id ? { ...b, userDefined: { ...b.userDefined, [key]: value } } : b,
      ),
    })),

  addGraphSeries: (series) =>
    set((s) => ({ graphSeries: [...s.graphSeries, series] })),
}))
