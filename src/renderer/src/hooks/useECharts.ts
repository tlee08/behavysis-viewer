import * as echarts from 'echarts'
import { useEffect, useRef, type RefObject } from 'react'

export function useECharts(containerRef: RefObject<HTMLDivElement | null>, height: number) {
  const chartRef = useRef<echarts.ECharts | null>(null)

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

  return chartRef
}
