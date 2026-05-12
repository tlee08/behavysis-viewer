import { useRef, useEffect, useCallback } from 'react'
import { Box } from '@mantine/core'
import { useStore } from '../store'

interface Props {
  videoUrl: string | null
}

export function VideoPane({ videoUrl }: Props): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    config,
    keypointDefs,
    keypointFrames,
    showKeypoints,
    isPlaying,
    vidSpeed,
    currentFrame,
    setCurrentFrame,
    setIsPlaying,
  } = useStore()
  const vidDims = { w: config?.widthPx ?? 640, h: config?.heightPx ?? 480 }

  const fps = config?.fps ?? 15
  const rvcHandle = useRef<ReturnType<typeof requestVideoFrameCallback>>(0)

  const drawKeypoints = useCallback(
    (frameNum: number) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (!showKeypoints || !keypointFrames[frameNum]) return
      const frameKpts = keypointFrames[frameNum]
      const radius = config?.keypointRadius ?? 5
      for (const def of keypointDefs) {
        const kpt = frameKpts[def.key]
        if (!kpt || kpt.likelihood < (config?.keypointPcutoff ?? 0)) continue
        const scaleX = canvas.width / (config?.widthPx ?? canvas.width)
        const scaleY = canvas.height / (config?.heightPx ?? canvas.height)
        ctx.beginPath()
        ctx.arc(kpt.x * scaleX, kpt.y * scaleY, radius, 0, Math.PI * 2)
        ctx.fillStyle = def.color
        ctx.fill()
      }
    },
    [showKeypoints, keypointFrames, keypointDefs, config],
  )

  const drawKeypointsRef = useRef(drawKeypoints)
  drawKeypointsRef.current = drawKeypoints

  const scheduleRvc = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    rvcHandle.current = video.requestVideoFrameCallback((_, meta) => {
      if (!useStore.getState().isPlaying) return
      const frame = Math.floor(meta.mediaTime * fps)
      setCurrentFrame(frame)
      drawKeypointsRef.current(frame)
      if (!video.paused) scheduleRvc()
    })
  }, [fps, setCurrentFrame])

  const scheduleRvcRef = useRef(scheduleRvc)
  scheduleRvcRef.current = scheduleRvc

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.play().then(() => scheduleRvc())
    } else {
      video.pause()
      video.cancelVideoFrameCallback(rvcHandle.current)
    }
  }, [isPlaying, scheduleRvc])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = vidSpeed
  }, [vidSpeed])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const targetTime = currentFrame / fps
    if (Math.abs(video.currentTime - targetTime) <= 1 / fps) return

    video.currentTime = targetTime
    if (isPlaying) {
      video.cancelVideoFrameCallback(rvcHandle.current)
      scheduleRvcRef.current()
    } else {
      drawKeypointsRef.current(currentFrame)
    }
  }, [currentFrame, fps, isPlaying])

  useEffect(() => {
    return () => {
      videoRef.current?.cancelVideoFrameCallback(rvcHandle.current)
    }
  }, [])

  return (
    <Box
      pos="relative"
      w="100%"
      style={{ aspectRatio: `${vidDims.w} / ${vidDims.h}`, background: '#111' }}
    >
      <video
        ref={videoRef}
        src={videoUrl ?? undefined}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
        onEnded={() => setIsPlaying(false)}
      />
      <canvas
        ref={canvasRef}
        width={vidDims.w}
        height={vidDims.h}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />
    </Box>
  )
}
