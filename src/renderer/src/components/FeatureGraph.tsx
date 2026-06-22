import { useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Stage, Text } from "react-konva";
import { useVisibleRange } from "../hooks/useVisibleRange";
import { useStore } from "../store";

const COLORS = [
  "#22c55e", "#ef4444", "#3b82f6", "#eab308", "#a855f7",
  "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1",
];

interface Props {
  height: number;
}

export function FeatureGraph({ height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(600);

  const {
    featureData,
    selectedFeatureColumns,
    featureYGlobal,
    featureScaleMode,
    videoMetadata,
    currentFrame,
    config,
  } = useStore();

  const [startFrame, endFrame] = useVisibleRange();
  const dataOffset = config?.startFrame ?? 0;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setStageWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (selectedFeatureColumns.length === 0) {
    return <div ref={containerRef} style={{ width: "100%", height, flexShrink: 0 }} />;
  }

  const frameCount = endFrame - startFrame + 1;
  if (frameCount <= 0) {
    return <div ref={containerRef} style={{ width: "100%", height, flexShrink: 0 }} />;
  }

  const toX = (f: number) =>
    ((f - startFrame) / (endFrame - startFrame)) * stageWidth;

  const cursorX = toX(currentFrame);

  const global = featureYGlobal;

  // Compute shared min/max for raw mode across all selected columns
  let sharedMin = Infinity;
  let sharedMax = -Infinity;
  if (featureScaleMode === "raw") {
    for (const col of selectedFeatureColumns) {
      const raw = featureData[col];
      if (!raw) continue;

      const visStart = Math.max(startFrame, dataOffset);
      const visEnd = Math.min(endFrame, dataOffset + raw.length - 1);
      const src =
        global
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

  const lines: { color: string; points: number[]; label: string }[] = [];

  for (let ci = 0; ci < selectedFeatureColumns.length; ci++) {
    const col = selectedFeatureColumns[ci];
    const raw = featureData[col];
    if (!raw) continue;

    const visStart = Math.max(startFrame, dataOffset);
    const visEnd = Math.min(endFrame, dataOffset + raw.length - 1);

    if (visEnd < visStart) {
      lines.push({ color: COLORS[ci % COLORS.length], points: [], label: col });
      continue;
    }

    const slice = raw.subarray(
      visStart - dataOffset,
      visEnd + 1 - dataOffset,
    );

    // Per-column stats for minmax/zscore modes
    let cMin = Infinity,
      cMax = -Infinity,
      cSum = 0,
      cCount = 0;
    const src = global ? raw : slice;
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

    lines.push({ color: COLORS[ci % COLORS.length], points, label: col });
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height, flexShrink: 0 }}>
      <Stage width={stageWidth} height={height}>
        <Layer>
          <Rect x={0} y={0} width={stageWidth} height={height} fill="#1a1a2e" />
        </Layer>
        <Layer>
          {lines.map((l, i) => (
            <Line key={i} points={l.points} stroke={l.color} strokeWidth={1.5} tension={0} />
          ))}
        </Layer>
        <Layer>
          {lines.map((l, i) => (
            <Text key={i} x={4} y={4 + i * 14} text={l.label} fontSize={10} fill={l.color} />
          ))}
        </Layer>
        <Layer>
          <Line
            points={[cursorX, 0, cursorX, height]}
            stroke="white"
            strokeWidth={1}
            dash={[4, 4]}
          />
        </Layer>
      </Stage>
    </div>
  );
}
