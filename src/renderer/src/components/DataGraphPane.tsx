/**
 * A scrolling line chart for any per-frame scalar series (e.g. mouse speed).
 * Extend the app by passing additional GraphSeries to the store and mounting
 * one <DataGraphPane> per series below the BoutTimeline.
 */
import { useRef, useEffect } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useStore } from '../store'
import type { GraphSeries } from '../types'

interface Props {
  series: GraphSeries
  height?: number
}

export function DataGraphPane({ series, height = 80 }: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<uPlot | null>(null)

  const { currentFrame, visibleRange, config } = useStore()
  const fps = config?.fps ?? 15

  // ── create uplot instance once ────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return

    const numFrames = series.values.length
    const xs = Float64Array.from({ length: numFrames }, (_, i) => i / fps)
    const ys = Array.from(series.values)
    const width = containerRef.current.clientWidth

    const opts: uPlot.Options = {
      width,
      height,
      cursor: { show: false },
      legend: { show: false },
      axes: [
        { show: true, stroke: '#64748b', ticks: { show: false } },
        { show: true, stroke: '#64748b', ticks: { show: false } },
      ],
      scales: {
        x: { time: false },
      },
      series: [
        {},
        {
          label: series.label,
          stroke: series.color,
          width: 1.5,
          fill: series.color + '22',
        },
      ],
    }

    plotRef.current = new uPlot(opts, [xs, ys], containerRef.current)

    // ResizeObserver: keep chart dimensions in sync with container
    const ro = new ResizeObserver(() => {
      const container = containerRef.current
      const plot = plotRef.current
      if (!container || !plot) return
      plot.setSize({ width: container.clientWidth, height })
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      plotRef.current?.destroy()
      plotRef.current = null
    }
    // Only recreate when the series data itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series])

  // ── update viewport on frame change ──────────────────────────────────────

  useEffect(() => {
    const plot = plotRef.current
    if (!plot) return
    const [xMin, xMax] = visibleRange.map((f) => f / fps)
    plot.setScale('x', { min: xMin, max: xMax })
  }, [currentFrame, visibleRange, fps])

  return (
    <div style={{ background: '#1a1a2e' }}>
      <div style={{ padding: '2px 4px', fontSize: 10, color: '#94a3b8' }}>{series.label}</div>
      <div ref={containerRef} />
    </div>
  )
}
