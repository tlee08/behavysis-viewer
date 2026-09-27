import { Box, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { Layer, Line, Rect, Stage, Text } from "react-konva";
import { LINE_COLORS } from "../lib/colors";
import { useElementSize } from "../hooks/useElementSize";
import { useVisibleRange } from "../hooks/useVisibleRange";
import { useStore } from "../store";
import { Panel } from "./Panel";

const MARGIN = { left: 30, right: 30, bottom: 20 };

export function FeatureGraph(): React.ReactElement {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const theme = useMantineTheme();

  const {
    featureData,
    selectedFeatureColumns,
    featureYGlobal,
    featureScaleMode,
    currentFrame,
    config,
  } = useStore();

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
    endFrame > startFrame && selectedFeatureColumns.length > 0 && width > 0;

  const lines: { color: string; points: number[]; label: string }[] = [];
  let sharedMin = Infinity;
  let sharedMax = -Infinity;

  if (show && featureScaleMode === "raw") {
    for (const col of selectedFeatureColumns) {
      const raw = featureData[col];
      if (!raw) continue;

      const visStart = Math.max(startFrame, dataOffset);
      const visEnd = Math.min(endFrame, dataOffset + raw.length - 1);
      const src = featureYGlobal
        ? raw
        : visEnd >= visStart
          ? raw.subarray(visStart - dataOffset, visEnd + 1 - dataOffset)
          : new Float64Array(0);

      for (let i = 0; i < src.length; i++) {
        const v = src[i];
        if (v < sharedMin) sharedMin = v;
        if (v > sharedMax) sharedMax = v;
      }
    }
  }
  const sharedRange = sharedMax - sharedMin || 1;

  if (show) {
    for (let ci = 0; ci < selectedFeatureColumns.length; ci++) {
      const col = selectedFeatureColumns[ci];
      const raw = featureData[col];
      if (!raw) continue;

      const visStart = Math.max(startFrame, dataOffset);
      const visEnd = Math.min(endFrame, dataOffset + raw.length - 1);

      if (visEnd < visStart) {
        lines.push({
          color: LINE_COLORS[ci % LINE_COLORS.length],
          points: [],
          label: col,
        });
        continue;
      }

      const slice = raw.subarray(
        visStart - dataOffset,
        visEnd + 1 - dataOffset,
      );

      let cMin = Infinity;
      let cMax = -Infinity;
      let cSum = 0;
      let cCount = 0;
      const src = featureYGlobal ? raw : slice;
      for (let i = 0; i < src.length; i++) {
        const v = src[i];
        if (v < cMin) cMin = v;
        if (v > cMax) cMax = v;
        cSum += v;
        cCount++;
      }
      const cMean = cSum / cCount;
      let cVar = 0;
      for (let i = 0; i < src.length; i++) {
        cVar += (src[i] - cMean) ** 2;
      }
      const cStd = Math.sqrt(cVar / cCount);
      const cRange = cMax - cMin || 1;

      const points: number[] = [];
      for (let i = 0; i < slice.length; i++) {
        const x = toX(visStart + i);
        let y: number;

        if (featureScaleMode === "raw") {
          y = height - ((slice[i] - sharedMin) / sharedRange) * height;
        } else if (featureScaleMode === "minmax") {
          y = height - ((slice[i] - cMin) / cRange) * height;
        } else {
          const z = cStd > 0 ? (slice[i] - cMean) / cStd : 0;
          const clamped = Math.max(-3, Math.min(3, z));
          y = height - ((clamped + 3) / 6) * height;
        }

        points.push(x, y);
      }

      lines.push({
        color: LINE_COLORS[ci % LINE_COLORS.length],
        points,
        label: col,
      });
    }
  }

  const curX = show ? toX(currentFrame) : 0;

  return (
    <Panel bg="#1a1a2e" style={{ overflow: "hidden" }}>
      <Box ref={ref} w="100%" h="100%">
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
    </Panel>
  );
}
