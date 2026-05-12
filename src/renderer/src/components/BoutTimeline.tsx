import { useRef, useEffect, useCallback } from 'react'
import { useMantineTheme } from '@mantine/core'
import { useStore } from '../store'
import { ACTUAL_COLORS } from '../types'

interface Props {
  height?: number
}

const ROW_HEIGHT = 24
const LABEL_WIDTH = 80

export function BoutTimeline({ height = 120 }: Props): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const theme = useMantineTheme()

  const { bouts, currentFrame, visibleRange, config, selectBout, selectedBoutId } =
    useStore()

  const fps = config?.fps ?? 15

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !container) return

    const width = container.clientWidth
    canvas.width = width
    canvas.height = height
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const [xMin, xMax] = visibleRange
    const frameRange = xMax - xMin
    const plotWidth = canvas.width - LABEL_WIDTH

    const frameToX = (f: number) => LABEL_WIDTH + ((f - xMin) / frameRange) * plotWidth

    const behavSet = new Set(bouts.map((b) => b.behav))
    const behavNames = [...behavSet]
    const rowCount = Math.max(behavNames.length, 1)
    const rowH = Math.min(ROW_HEIGHT, (canvas.height - 4) / rowCount)

    ctx.font = '11px monospace'

    behavNames.forEach((behav, rowIdx) => {
      const y = 2 + rowIdx * rowH

      ctx.fillStyle = theme.colors.dark[2]
      ctx.fillText(behav, 4, y + rowH * 0.65)

      for (const bout of bouts) {
        if (bout.behav !== behav) continue
        if (bout.stop < xMin || bout.start > xMax) continue

        const x0 = Math.max(frameToX(bout.start), LABEL_WIDTH)
        const x1 = Math.min(frameToX(bout.stop + 1), canvas.width)
        if (x1 <= x0) continue

        ctx.fillStyle = ACTUAL_COLORS[bout.actual]
        ctx.globalAlpha = bout.id === selectedBoutId ? 1 : 0.75
        ctx.fillRect(x0, y + 2, x1 - x0, rowH - 4)
        ctx.globalAlpha = 1

        if (bout.id === selectedBoutId) {
          ctx.strokeStyle = theme.white
          ctx.lineWidth = 1.5
          ctx.strokeRect(x0, y + 2, x1 - x0, rowH - 4)
        }
      }
    })

    const markerX = frameToX(currentFrame)
    ctx.strokeStyle = theme.colors.blue[4]
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(markerX, 0)
    ctx.lineTo(markerX, canvas.height)
    ctx.stroke()
  }, [bouts, currentFrame, visibleRange, selectedBoutId, config, height, theme])

  useEffect(() => { draw() }, [draw])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas || bouts.length === 0) return

      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top

      const [xMin, xMax] = visibleRange
      const frameRange = xMax - xMin
      const plotWidth = canvas.width - LABEL_WIDTH

      const clickedFrame = xMin + ((cx - LABEL_WIDTH) / plotWidth) * frameRange

      const behavSet = new Set(bouts.map((b) => b.behav))
      const behavNames = [...behavSet]
      const rowH = Math.min(ROW_HEIGHT, (canvas.height - 4) / Math.max(behavNames.length, 1))
      const rowIdx = Math.floor((cy - 2) / rowH)
      const behav = behavNames[rowIdx]
      if (!behav) return

      const hit = bouts.find(
        (b) => b.behav === behav && b.start <= clickedFrame && b.stop + 1 >= clickedFrame,
      )
      if (hit) selectBout(hit.id)
    },
    [bouts, visibleRange, selectBout],
  )

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        height={height}
        onClick={handleClick}
        style={{ display: 'block', cursor: 'pointer', background: '#1a1a2e', width: '100%' }}
      />
    </div>
  )
}
