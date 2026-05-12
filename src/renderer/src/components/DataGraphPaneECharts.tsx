import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'
import { Box } from '@mantine/core'
import { useMantineTheme } from '@mantine/core'
import { useStore } from '../store'
import type { GraphSeries } from '../types'

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
  const theme = useMantineTheme()

  const { currentFrame, visibleRange, config } = useStore()
  const fps = config?.fps ?? 15

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
          type: 'value',
          min: xMin,
          max: xMax,
          interval: (xMax - xMin) / 4,
          axisLine: { lineStyle: { color: theme.colors.dark[4] } },
          axisTick: { lineStyle: { color: theme.colors.dark[4] } },
          axisLabel: {
            margin: 6,
            fontSize: 11,
            color: theme.colors.dark[2],
            formatter: (v: number) => `${v.toFixed(1)}s`,
          },
          splitLine: { show: false },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: theme.colors.dark[4] } },
          axisLabel: { fontSize: 9, color: theme.colors.dark[3] },
          splitLine: { lineStyle: { color: theme.colors.dark[5], width: 0.5 } },
        },
        series: [
          {
            type: 'line',
            data,
            smooth: true,
            showSymbol: false,
            lineStyle: { color: series.color, width: 1.5 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: series.color + '44' },
                { offset: 1, color: series.color + '00' },
              ]),
            },
            markLine: {
              silent: true,
              symbol: ['none', 'none'],
              label: { show: false },
              lineStyle: { color: theme.colors.blue[4], width: 2 },
              data: [{ xAxis: markerX }],
            },
          },
        ],
        backgroundColor: '#1a1a2e',
        animation: false,
      },
      { notMerge: true },
    )
  }, [series.values, fps, visibleRange, currentFrame, theme])

  return (
    <Box bg="#1a1a2e" style={{ flexShrink: 0 }}>
      <Box style={{ padding: '2px 8px', fontSize: 10, color: 'var(--mantine-color-dark-2)' }}>
        {series.label}
      </Box>
      <div ref={containerRef} style={{ width: '100%', height: `${height}px` }} />
    </Box>
  )
}
