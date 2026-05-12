import { create } from 'zustand'
import type { Bout, AppConfig, ExperimentPaths, KeypointFrame, GraphSeries, KeypointDef, ActualValue } from '../../shared/types'

interface AppState {
  paths: ExperimentPaths | null
  config: AppConfig | null
  numFrames: number
  bouts: Bout[]
  keypointDefs: KeypointDef[]
  keypointFrames: KeypointFrame[]
  graphSeries: GraphSeries[]

  currentFrame: number
  isPlaying: boolean
  vidSpeed: number
  visibleRange: [number, number]
  focusSizeFrames: number

  showKeypoints: boolean
  focusBout: boolean
  jumpSeconds: number
  graphWindowSeconds: number

  selectedBoutId: number | null

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
  setKeypointPcutoff: (pcutoff: number) => void
  setJumpSeconds: (seconds: number) => void
  setGraphWindowSeconds: (seconds: number) => void

  selectBout: (id: number | null) => void
  updateBoutActual: (id: number, actual: ActualValue) => void
  updateBoutUserDefined: (id: number, key: string, value: ActualValue) => void

  addGraphSeries: (series: GraphSeries) => void
}

const centerVisibleRange = (frame: number, s: AppState): [number, number] => {
  const half = Math.floor((s.graphWindowSeconds * (s.config?.fps ?? 15)) / 2)
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
  jumpSeconds: 5,
  graphWindowSeconds: 10,

  selectedBoutId: null,

  loadExperiment: (paths, config, numFrames, bouts, keypointDefs, keypointFrames) => {
    const density = new Float32Array(numFrames)
    for (const b of bouts) {
      for (let i = b.start; i <= b.stop; i++) density[i]++
    }
    const graphSeries: GraphSeries[] = [
      { label: 'Bout density', color: '#60a5fa', values: density },
    ]
    set({ paths, config, numFrames, bouts, keypointDefs, keypointFrames, graphSeries, currentFrame: 0, selectedBoutId: null })
  },

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
  setKeypointPcutoff: (keypointPcutoff) =>
    set((s) => ({ config: s.config ? { ...s.config, keypointPcutoff } : null })),
  setJumpSeconds: (jumpSeconds) => set({ jumpSeconds }),
  setGraphWindowSeconds: (graphWindowSeconds) => set({ graphWindowSeconds }),

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
