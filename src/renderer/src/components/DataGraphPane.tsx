import { Box, useMantineTheme } from "@mantine/core";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import type { GraphSeries } from "../types";
import { useECharts } from "../hooks/useECharts";
import { useStore } from "../store";

interface Props {
  series: GraphSeries;
  height?: number;
}

export function DataGraphPane({
  series,
  height = 80,
}: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useECharts(containerRef, height);
  const theme = useMantineTheme();
  const { currentFrame, visibleRange, config } = useStore();
  const fps = config?.fps ?? 15;
  const xMin = visibleRange[0] / fps;
  const xMax = visibleRange[1] / fps;
  const markerX = currentFrame / fps;

  const dataRef = useRef<[number, number][]>([]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const n = series.values.length;
    const pairs: [number, number][] = (dataRef.current.length === n ? dataRef.current : []);
    for (let i = 0; i < n; i++) {
      pairs[i] = pairs[i] ?? [0, 0];
      pairs[i][0] = i / fps;
      pairs[i][1] = series.values[i];
    }
    if (pairs.length > n) pairs.length = n;
    dataRef.current = pairs;

    chart.setOption(
      {
        grid: { top: 8, right: 8, bottom: 32, left: 48, containLabel: true },
        xAxis: {
          type: "value",
          min: xMin,
          max: xMax,
          interval: (xMax - xMin) / 4,
          axisLine: { lineStyle: { color: theme.colors.dark[4] } },
          axisTick: { show: true, lineStyle: { color: theme.colors.dark[4] } },
          axisLabel: {
            show: true,
            margin: 6,
            fontSize: 11,
            color: theme.colors.dark[2],
            formatter: (v: number) => `${v.toFixed(1)}s`,
          },
          splitLine: { show: false },
        },
        yAxis: {
          type: "value",
          axisLine: { lineStyle: { color: theme.colors.dark[4] } },
          axisTick: { show: true, lineStyle: { color: theme.colors.dark[4] } },
          axisLabel: { fontSize: 9, color: theme.colors.dark[3] },
          splitLine: { lineStyle: { color: theme.colors.dark[5], width: 0.5 } },
        },
        series: [
          {
            type: "line",
            data: pairs,
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
              lineStyle: { color: theme.colors.blue[4], width: 2 },
              data: [{ xAxis: markerX }],
            },
          },
        ],
        backgroundColor: "#1a1a2e",
        animation: false,
      },
      { notMerge: true },
    );
  }, [series.values, fps, xMin, xMax, markerX, theme]);

  return (
    <Box bg="#1a1a2e" style={{ flexShrink: 0 }}>
      <Box style={{ padding: "2px 8px", fontSize: 10 }} c="dark.2">
        {series.label}
      </Box>
      <div
        ref={containerRef}
        style={{ width: "100%", height: `${height}px` }}
      />
    </Box>
  );
}
