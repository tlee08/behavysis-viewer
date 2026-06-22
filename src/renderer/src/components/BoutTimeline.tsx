import { Box, useMantineTheme } from "@mantine/core";
import type Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Line, Rect, Stage, Text } from "react-konva";
import { ACTUAL_COLORS } from "../../../shared/types";
import { useVisibleRange } from "../hooks/useVisibleRange";
import { useStore } from "../store";

interface Props {
  height?: number;
}

const ROW_HEIGHT = 24;
const HANDLE_W = 8;
const MARGIN = { top: 4, right: 8, bottom: 24, left: 72 };

export function BoutTimeline({ height = 120 }: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const theme = useMantineTheme();

  const {
    bouts,
    selectBout,
    selectedBoutId,
    currentFrame,
    interimBoutEdit,
    setInterimBoutEdit,
    numFrames,
  } = useStore();
  const fps = useStore((s) => s.config?.fps ?? 15);
  const visibleRange = useVisibleRange();
  const xMin = visibleRange[0] / fps;
  const xMax = visibleRange[1] / fps;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    setStageWidth(node.clientWidth);
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        setStageWidth(containerRef.current.clientWidth);
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const chartWidth = stageWidth - MARGIN.left - MARGIN.right;
  const chartHeight = height - MARGIN.top - MARGIN.bottom;

  const behavNames = useMemo(
    () => [...new Set(bouts.map((b) => b.behav))],
    [bouts],
  );

  const rowHeight =
    behavNames.length > 0 ? chartHeight / behavNames.length : chartHeight;
  const barH = Math.min(ROW_HEIGHT * 0.7, rowHeight * 0.7);

  const frameToX = useCallback(
    (frame: number): number => {
      const sec = frame / fps;
      const ratio = chartWidth > 0 ? (sec - xMin) / (xMax - xMin) : 0;
      return MARGIN.left + ratio * chartWidth;
    },
    [fps, xMin, xMax, chartWidth],
  );

  const xToFrame = useCallback(
    (x: number): number => {
      const ratio = chartWidth > 0 ? (x - MARGIN.left) / chartWidth : 0;
      return Math.round(ratio * (xMax - xMin) * fps + xMin * fps);
    },
    [fps, xMin, xMax, chartWidth],
  );

  const secToX = useCallback(
    (sec: number): number => {
      const ratio = chartWidth > 0 ? (sec - xMin) / (xMax - xMin) : 0;
      return MARGIN.left + ratio * chartWidth;
    },
    [xMin, xMax, chartWidth],
  );

  const behavToY = useCallback(
    (behav: string): number =>
      MARGIN.top + behavNames.indexOf(behav) * rowHeight + rowHeight / 2,
    [behavNames, rowHeight],
  );

  const xTicks = useMemo(() => {
    if (chartWidth <= 0) return [];
    const step = (xMax - xMin) / 4;
    const ticks: number[] = [];
    for (let i = 0; i <= 4; i++) {
      ticks.push(xMin + i * step);
    }
    return ticks;
  }, [xMin, xMax, chartWidth]);

  const selectedBout = useMemo(
    () =>
      selectedBoutId !== null
        ? (bouts.find((b) => b.id === selectedBoutId) ?? null)
        : null,
    [bouts, selectedBoutId],
  );

  const ghostVisible =
    interimBoutEdit !== null &&
    selectedBout !== null &&
    interimBoutEdit.boutId === selectedBout.id;

  const ghostX = ghostVisible ? frameToX(interimBoutEdit!.start) : 0;
  const ghostEndX = ghostVisible ? frameToX(interimBoutEdit!.stop) : 0;
  const ghostWidth = Math.max(ghostEndX - ghostX, 2);
  const ghostY = ghostVisible ? behavToY(selectedBout!.behav) - barH / 2 : 0;
  const ghostColor = ghostVisible
    ? ACTUAL_COLORS[selectedBout!.actual]
    : "#fff";

  const handleDragBound = useCallback(
    (side: "start" | "stop", pos: { x: number; y: number }) => {
      const leftBound = MARGIN.left - HANDLE_W / 2;
      const rightBound = MARGIN.left + chartWidth - HANDLE_W / 2;
      if (side === "start") {
        const maxX = ghostEndX - 2 - HANDLE_W / 2;
        return {
          x: Math.max(leftBound, Math.min(pos.x, maxX)),
          y: ghostY,
        };
      }
      const minX = ghostX + 2 - HANDLE_W / 2;
      return {
        x: Math.max(minX, Math.min(pos.x, rightBound)),
        y: ghostY,
      };
    },
    [ghostX, ghostEndX, ghostY, chartWidth],
  );

  const handleDragEnd = useCallback(
    (side: "start" | "stop", e: Konva.KonvaEventObject<DragEvent>) => {
      if (!interimBoutEdit) return;
      const handleX = e.target.x();
      const edgeX = handleX + HANDLE_W / 2;
      const frame = xToFrame(edgeX);
      const clamped = Math.max(0, Math.min(frame, numFrames - 1));

      if (side === "start" && clamped < interimBoutEdit.stop) {
        setInterimBoutEdit({ ...interimBoutEdit, start: clamped });
      } else if (side === "stop" && clamped > interimBoutEdit.start) {
        setInterimBoutEdit({ ...interimBoutEdit, stop: clamped });
      }
    },
    [interimBoutEdit, xToFrame, numFrames, setInterimBoutEdit],
  );

  if (bouts.length === 0 || stageWidth === 0) {
    return (
      <Box bg="#1a1a2e" style={{ flexShrink: 0 }}>
        <div
          ref={containerRef}
          style={{ width: "100%", height: `${height}px` }}
        />
      </Box>
    );
  }

  const currentTimeX = frameToX(currentFrame);

  return (
    <Box bg="#1a1a2e" style={{ flexShrink: 0 }}>
      <div ref={containerRef} style={{ width: "100%", height: `${height}px` }}>
        <Stage width={stageWidth} height={height}>
          <Layer>
            <Rect
              x={0}
              y={0}
              width={stageWidth}
              height={height}
              fill="#1a1a2e"
            />
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
            {behavNames.map((name) => (
              <Text
                key={`label-${name}`}
                x={MARGIN.left - 4}
                y={behavToY(name) - 7}
                text={name}
                fontSize={11}
                fill={theme.colors.dark[2]}
                align="right"
                fontFamily="monospace"
              />
            ))}
          </Layer>

          <Layer>
            {bouts.map((b) => {
              const x0 = frameToX(b.start);
              const x1 = frameToX(b.stop + 1);
              const y = behavToY(b.behav) - barH / 2;
              const isSelected = b.id === selectedBoutId;
              const color = ACTUAL_COLORS[b.actual];
              return (
                <Rect
                  key={`bout-${b.id}`}
                  x={x0}
                  y={y}
                  width={Math.max(x1 - x0, 2)}
                  height={barH}
                  fill={isSelected ? color : color + "BF"}
                  stroke={isSelected ? theme.white : undefined}
                  strokeWidth={isSelected ? 1.5 : 0}
                  onClick={() => selectBout(b.id)}
                />
              );
            })}
          </Layer>

          {ghostVisible && (
            <Layer>
              <Rect
                x={ghostX}
                y={ghostY}
                width={ghostWidth}
                height={barH}
                fill={ghostColor + "40"}
                stroke={ghostColor}
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
              <Rect
                x={ghostX - HANDLE_W / 2}
                y={ghostY}
                width={HANDLE_W}
                height={barH}
                fill={theme.white}
                stroke={ghostColor}
                strokeWidth={1}
                draggable
                dragBoundFunc={(pos) => handleDragBound("start", pos)}
                onDragEnd={(e) => handleDragEnd("start", e)}
              />
              <Rect
                x={ghostEndX - HANDLE_W / 2}
                y={ghostY}
                width={HANDLE_W}
                height={barH}
                fill={theme.white}
                stroke={ghostColor}
                strokeWidth={1}
                draggable
                dragBoundFunc={(pos) => handleDragBound("stop", pos)}
                onDragEnd={(e) => handleDragEnd("stop", e)}
              />
            </Layer>
          )}

          <Layer>
            <Line
              points={[
                currentTimeX,
                MARGIN.top,
                currentTimeX,
                height - MARGIN.bottom,
              ]}
              stroke={theme.white}
              strokeWidth={1.5}
              dash={[3, 3]}
              listening={false}
            />
          </Layer>
        </Stage>
      </div>
    </Box>
  );
}
