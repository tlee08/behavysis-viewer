import { useMemo } from 'react'
import { useStore } from '../store'

export function useVisibleRange(): [number, number] {
  const currentFrame = useStore((s) => s.currentFrame)
  const graphWindowSeconds = useStore((s) => s.graphWindowSeconds)
  const numFrames = useStore((s) => s.numFrames)
  const config = useStore((s) => s.config)

  return useMemo(() => {
    const fps = config?.fps ?? 15
    const half = Math.floor((graphWindowSeconds * fps) / 2)
    return [Math.max(0, currentFrame - half), Math.min(numFrames - 1, currentFrame + half)]
  }, [currentFrame, graphWindowSeconds, numFrames, config?.fps])
}
