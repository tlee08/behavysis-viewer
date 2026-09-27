import { Box, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { Layer, Line, Rect, Stage, Text } from "react-konva";
import { LINE_COLORS } from "../lib/colors";
import { useElementSize } from "../hooks/useElementSize";
import { useVisibleRange } from "../hooks/useVisibleRange";
import { useStore } from "../store";

const MARGIN = { left: 30, right: 30, bottom: 20 };

export function ClassifierGraph(): React.ReactElement {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const theme = useMantineTheme();

  const { predicted, selectedBehaviours, currentFrame, config } = useStore();
  const [startFrame, endFrame] = useVisibleRange();
  const fps = config!.fps;
  const dataOffset = config!.startFrame;

  const chartWidth = width - MARGIN.left - MARGIN.right;

  const toX = (f: number) =>
    MARGIN.left + ((f - startFrame) / (endFrame - startFrame)) * chartWidth;

  const xMinSec = startFrame / fps;
  const xMaxSec = endFrame / fps;

  const xTicks = useMemo(() => {
    if (chartWidth <= 0) return [];
    const step = (xMaxSec - xMinSec) / 4;
    const ticks: number[] = [];
    for (let i = 0; i <= 4; i++) ticks.push(xMinSec + i * step);
    return ticks;
  }, [xMinSec, xMaxSec, chartWidth]);

  const secToX = (sec: number) =>
    MARGIN.left + ((sec - xMinSec) / (xMaxSec - xMinSec)) * chartWidth;

  const show =
    predicted !== null &&
    selectedBehaviours.length > 0 &&
    endFrame > startFrame &&
    width > 0;

  const lines: { color: string; points: number[]; label: string }[] = [];

  if (show) {
    const visStart = Math.max(startFrame, dataOffset);
    selectedBehaviours.forEach((behav, i) => {
      const arr = predicted.prob[behav];
      if (!arr) return;
      const visEnd = Math.min(endFrame, dataOffset + arr.length - 1);
      if (visEnd < visStart) {
        lines.push({ color: LINE_COLORS[i % LINE_COLORS.length], points: [], label: behav });
        return;
      }

      const points: number[] = [];
      for (let f = visStart; f <= visEnd; f++) {
        const v = arr[f - dataOffset];
        if (Number.isNaN(v)) continue;
        points.push(toX(f), height - v * height);
      }
      lines.push({ color: LINE_COLORS[i % LINE_COLORS.length], points, label: behav });
    });
  }

  const curX = show ? toX(currentFrame) : 0;
  const thresholdY = height * 0.5;

  return (
    <Box ref={ref} w="100%" h="100%" bg="#1a1a2e">
      {show && lines.length > 0 && (
        <Stage width={width} height={height}>
          <Layer>
            <Rect x={0} y={0} width={width} height={height} fill="#1a1a2e" />
            {xTicks.map((t, i) => (
              <Text
                key={`tick-${i}`}
                x={secToX(t)}
                y={height - MARGIN.bottom + 4}
                text={`${t.toFixed(1)}s`}
                fontSize={11}
                fill={theme.colors.dark[2]}
                align="center"
              />
            ))}
            <Line
              points={[
                MARGIN.left,
                height - MARGIN.bottom,
                MARGIN.left + chartWidth,
                height - MARGIN.bottom,
              ]}
              stroke={theme.colors.dark[4]}
              strokeWidth={1}
            />
            <Line
              points={[MARGIN.left, thresholdY, MARGIN.left + chartWidth, thresholdY]}
              stroke={theme.colors.dark[4]}
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          </Layer>
          <Layer>
            {lines.map((l, i) => (
              <Line
                key={i}
                points={l.points}
                stroke={l.color}
                strokeWidth={1.5}
                tension={0}
              />
            ))}
          </Layer>
          <Layer>
            {lines.map((l, i) => (
              <Text
                key={i}
                x={MARGIN.left - 4}
                y={4 + i * 14}
                text={l.label}
                fontSize={10}
                fill={l.color}
                align="right"
                fontFamily="monospace"
              />
            ))}
          </Layer>
          <Layer>
            <Line
              points={[curX, 0, curX, height]}
              stroke={theme.white}
              strokeWidth={1.5}
              dash={[3, 3]}
              listening={false}
            />
          </Layer>
        </Stage>
      )}
    </Box>
  );
}
