import { Box, useMantineTheme } from "@mantine/core";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import { useVisibleRange } from "../hooks/useVisibleRange";
import { useStore } from "../store";
import { ACTUAL_COLORS } from "../../../shared/types";

interface Props {
  height?: number;
}

const ROW_HEIGHT = 24;

export function BoutTimeline({ height = 120 }: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const selectBoutRef = useRef(useStore.getState().selectBout);
  const theme = useMantineTheme();
  const {
    bouts,
    selectBout,
    selectedBoutId,
    config,
  } = useStore();
  const visibleRange = useVisibleRange();
  const fps = config?.fps ?? 15;
  const xMin = visibleRange[0] / fps;
  const xMax = visibleRange[1] / fps;

  selectBoutRef.current = selectBout;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const chart = echarts.init(node, undefined, {
      width: node.clientWidth,
      height,
    });
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      const w = containerRef.current?.clientWidth;
      if (w) chart.resize({ width: w, height });
    });
    ro.observe(node);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.on("click", { element: "bout-bar" }, (params: any) => {
      if (params.info !== undefined) {
        selectBoutRef.current(params.info);
      }
    });
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || bouts.length === 0) {
      chart?.clear();
      return;
    }

    const behavNames = [...new Set(bouts.map((b) => b.behav))];
    const data = bouts.map((b) => [
      b.start / fps,
      (b.stop + 1) / fps,
      b.behav,
      ACTUAL_COLORS[b.actual],
      b.id,
      b.id === selectedBoutId ? 1 : 0,
    ]);

    chart.setOption(
      {
        grid: { top: 4, right: 8, bottom: 24, left: 72 },
        xAxis: {
          type: "value",
          min: xMin,
          max: xMax,
          interval: (xMax - xMin) / 4,
          axisLine: { lineStyle: { color: theme.colors.dark[4] } },
          axisTick: { show: true, lineStyle: { color: theme.colors.dark[4] } },
          axisLabel: {
            show: true,
            color: theme.colors.dark[2],
            fontSize: 11,
            formatter: (v: number) => `${v.toFixed(1)}s`,
          },
          splitLine: { show: false },
        },
        yAxis: {
          type: "category",
          data: behavNames,
          position: "left",
          axisLabel: {
            color: theme.colors.dark[2],
            fontSize: 11,
            fontFamily: "monospace",
          },
          axisTick: { show: false },
          axisLine: { show: false },
        },
        series: [
          {
            type: "custom",
            encode: { x: [0, 1], y: 2 },
            renderItem: (_params: any, api: any) => {
              const start = api.value(0) as number;
              const stop = api.value(1) as number;
              const behav = api.value(2) as string;
              const color = api.value(3) as string;
              const isSelected = api.value(5) as number;

              const [x0, y] = api.coord([start, behav]);
              const [x1] = api.coord([stop, behav]);
              const barH = Math.min(ROW_HEIGHT * 0.7, api.size([1])[1] * 0.7);

              return {
                type: "rect",
                shape: {
                  x: x0,
                  y: y - barH / 2,
                  width: Math.max(x1 - x0, 2),
                  height: barH,
                },
                style: {
                  fill: isSelected ? color : color + "BF",
                  stroke: isSelected ? theme.white : undefined,
                  lineWidth: isSelected ? 1.5 : 0,
                },
                name: "bout-bar",
                info: api.value(4),
              };
            },
            data,
          },
        ],
        backgroundColor: "#1a1a2e",
        animation: false,
      },
      { notMerge: true },
    );
  }, [bouts, selectedBoutId, xMin, xMax, fps, theme]);

  return (
    <Box bg="#1a1a2e" style={{ flexShrink: 0 }}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: `${height}px` }}
      />
    </Box>
  );
}
