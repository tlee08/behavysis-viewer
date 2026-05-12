import * as echarts from "echarts"
import { useEffect, useRef } from "react"
import { useStore } from "../store"
import type { GraphSeries } from "../types"

interface Props {
  series: GraphSeries
  height?: number
}

export function DataGraphPaneECharts({
  series,
  height = 80,
}: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const { currentFrame, visibleRange, config } = useStore()
  const fps = config?.fps ?? 15

  // init + cleanup
  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const chart = echarts.init(node, undefined, {
      width: node.clientWidth,
      height,
    })
    chartRef.current = chart

    const ro = new ResizeObserver(() => {
      const w = containerRef.current?.clientWidth
      if (w) chart.resize({ width: w, height })
    })
    ro.observe(node)

    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [height])

  // setOption — single unified update for data + viewport + marker
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const n = series.values.length
    const xMin = visibleRange[0] / fps
    const xMax = visibleRange[1] / fps
    const markerX = currentFrame / fps

    const data: [number, number][] = []
    for (let i = 0; i < n; i++) data.push([i / fps, series.values[i]])

    chart.setOption(
      {
        grid: { top: 4, right: 8, bottom: 24, left: 48 },
        xAxis: {
          type: "value",
          min: xMin,
          max: xMax,
          interval: (xMax - xMin) / 4,
          axisLine: { lineStyle: { color: "#475569" } },
          axisTick: { lineStyle: { color: "#475569" } },
          axisLabel: {
            margin: 6,
            fontSize: 11,
            color: "#94a3b8",
            formatter: (v: number) => `${v.toFixed(1)}s`,
          },
          splitLine: { show: false },
        },
        yAxis: {
          type: "value",
          axisLine: { lineStyle: { color: "#475569" } },
          axisLabel: { fontSize: 9, color: "#64748b" },
          splitLine: { lineStyle: { color: "#334155", width: 0.5 } },
        },
        series: [
          {
            type: "line",
            data,
            smooth: true,
            showSymbol: false,
            lineStyle: { color: series.color, width: 1.5 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: series.color + "44" },
                { offset: 1, color: series.color + "00" },
              ]),
            },
            markLine: {
              silent: true,
              symbol: ["none", "none"],
              label: { show: false },
              lineStyle: { color: "#60a5fa", width: 2 },
              data: [{ xAxis: markerX }],
            },
          },
        ],
        backgroundColor: "#1a1a2e",
        animation: false,
      },
      { notMerge: true },
    )
  }, [series.values, fps, visibleRange, currentFrame])

  return (
    <div style={{ background: "#1a1a2e", flexShrink: 0 }}>
      <div style={{ padding: "2px 8px", fontSize: 10, color: "#94a3b8" }}>
        {series.label}
      </div>
      <div ref={containerRef} style={{ width: "100%", height: `${height}px` }} />
    </div>
  )
}
