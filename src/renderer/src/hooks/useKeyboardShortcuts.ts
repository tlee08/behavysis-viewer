import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { JUMP_FRAMES } from '../constants'

export function useKeyboardShortcuts(): void {
  const isPlayingRef = useRef(false)
  const currentFrameRef = useRef(0)
  const numFramesRef = useRef(0)
  const fpsRef = useRef(15)
  const showKeypointsRef = useRef(false)
  const focusBoutRef = useRef(false)
  const selectedBoutIdRef = useRef<number | null>(null)
  const boutsRef = useRef<ReturnType<typeof useStore.getState>['bouts']>([])
  const focusSizeFramesRef = useRef(0)

  useEffect(() => {
    const unsub = useStore.subscribe((s) => {
      isPlayingRef.current = s.isPlaying
      currentFrameRef.current = s.currentFrame
      numFramesRef.current = s.numFrames
      fpsRef.current = s.config?.fps ?? 15
      showKeypointsRef.current = s.showKeypoints
      focusBoutRef.current = s.focusBout
      selectedBoutIdRef.current = s.selectedBoutId
      boutsRef.current = s.bouts
      focusSizeFramesRef.current = s.focusSizeFrames
    })

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT') return

      const {
        setIsPlaying,
        panToFrame,
        setShowKeypoints,
        setFocusBout,
        updateBoutActual,
        selectBout,
      } = useStore.getState()

      const fps = fpsRef.current
      const currentFrame = currentFrameRef.current
      const numFrames = numFramesRef.current
      const selectedBoutId = selectedBoutIdRef.current
      const bouts = boutsRef.current
      const focusSizeFrames = focusSizeFramesRef.current

      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsPlaying(!isPlayingRef.current)
          break
        case 'ArrowLeft':
          e.preventDefault()
          panToFrame(Math.max(0, currentFrame - JUMP_FRAMES(fps)))
          break
        case 'ArrowRight':
          e.preventDefault()
          panToFrame(Math.min(numFrames - 1, currentFrame + JUMP_FRAMES(fps)))
          break
        case 'k':
        case 'K':
          setShowKeypoints(!showKeypointsRef.current)
          break
        case 'f':
        case 'F':
          setFocusBout(!focusBoutRef.current)
          break
        case 'r':
        case 'R': {
          if (selectedBoutId === null) break
          const bout = bouts.find((b) => b.id === selectedBoutId)
          if (bout) panToFrame(Math.max(0, bout.start - focusSizeFrames))
          break
        }
        case 'ArrowUp':
        case 'ArrowDown': {
          e.preventDefault()
          const sorted = [...bouts].sort((a, b) => a.start - b.start)
          const curIdx = sorted.findIndex((b) => b.id === selectedBoutId)
          const dir = e.key === 'ArrowDown' ? 1 : -1
          const newIdx = curIdx === -1
            ? (dir === 1 ? 0 : sorted.length - 1)
            : Math.max(0, Math.min(curIdx + dir, sorted.length - 1))
          const target = sorted[newIdx]
          if (target) {
            selectBout(target.id)
            panToFrame(Math.max(0, target.start - focusSizeFrames))
          }
          break
        }
        case '1':
          if (selectedBoutId !== null) updateBoutActual(selectedBoutId, 1)
          break
        case '2':
          if (selectedBoutId !== null) updateBoutActual(selectedBoutId, 0)
          break
        case '3':
          if (selectedBoutId !== null) updateBoutActual(selectedBoutId, -1)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      unsub()
      window.removeEventListener('keydown', handler)
    }
  }, [])
}
