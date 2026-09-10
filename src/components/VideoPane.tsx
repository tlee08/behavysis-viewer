import { Box } from "@mantine/core";
import { useCallback, useEffect, useRef } from "react";
import type { FrameMetadata, FrameReader } from "../lib/frameReader";
import { getColorMapColor } from "../lib/colors";
import { useStore } from "../store";

interface Props {
  reader: FrameReader | null;
  metadata: FrameMetadata | null;
}

export function VideoPane({ reader, metadata }: Props) {
  const videoRef = useRef<HTMLCanvasElement>(null);
  const kptRef = useRef<HTMLCanvasElement>(null);

  const {
    config,
    keypoints,
    showVideo,
    showKeypoints,
    keypointPcutoff,
    keypointRadius,
    keypointColorMode,
    keypointColorMap,
    isPlaying,
    currentFrame,
    setCurrentFrame,
    setIsPlaying,
  } = useStore();

  const fps = config!.fps;
  const w = config!.widthPx;
  const h = config!.heightPx;

  const drawFrame = useCallback(
    (i: number): Promise<void> => {
      const ctx = videoRef.current?.getContext("2d");
      if (!ctx || !reader) return Promise.resolve();
      if (!showVideo) {
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, w, h);
        return Promise.resolve();
      }
      return reader
        .getFrame(i)
        .then((f) => {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(f, 0, 0, w, h);
        })
        .catch((err) => console.error("drawFrame", i, err));
    },
    [reader, showVideo, w, h],
  );

  const drawKpts = useCallback(
    (i: number) => {
      const ctx = kptRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      if (!showKeypoints || !keypoints || i >= keypoints.numFrames) return;

      const r = keypointRadius;
      const pcutoff = keypointPcutoff;
      const sx = w / config!.widthPx;
      const sy = h / config!.heightPx;

      const { defs, x, y, likelihood } = keypoints;
      const colorByIndividual = keypointColorMode === "individual";
      const keys = [
        ...new Set(defs.map((d) => (colorByIndividual ? d.indiv : d.bpt))),
      ].sort();
      const colorIdx = new Map<string, number>();
      keys.forEach((k, idx) => colorIdx.set(k, idx));

      for (let d = 0; d < defs.length; d++) {
        if (likelihood[d][i] < pcutoff) continue;
        const key = colorByIndividual ? defs[d].indiv : defs[d].bpt;
        ctx.beginPath();
        ctx.arc(x[d][i] * sx, y[d][i] * sy, r, 0, Math.PI * 2);
        ctx.fillStyle = getColorMapColor(
          keypointColorMap,
          colorIdx.get(key)!,
          keys.length,
        );
        ctx.fill();
      }
    },
    [
      showKeypoints,
      keypoints,
      config,
      w,
      h,
      keypointPcutoff,
      keypointRadius,
      keypointColorMode,
      keypointColorMap,
    ],
  );

  useEffect(() => {
    if (!isPlaying || !reader || !metadata) return;

    let frame = useStore.getState().currentFrame;
    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    const loop = async () => {
      while (!cancelled) {
        const s = useStore.getState();
        if (!s.isPlaying) break;

        if (Math.abs(s.currentFrame - frame) > 2) {
          frame = s.currentFrame;
        }

        const start = performance.now();
        await drawFrame(frame);
        if (cancelled) break;
        drawKpts(frame);
        setCurrentFrame(frame);

        if (frame >= metadata.totalFrames - 1) {
          setIsPlaying(false);
          break;
        }
        frame += 1;

        const interval = 1000 / (fps * useStore.getState().vidSpeed);
        const wait = interval - (performance.now() - start);
        if (wait > 0) await sleep(wait);
      }
    };

    loop();
    return () => {
      cancelled = true;
    };
  }, [
    isPlaying,
    reader,
    metadata,
    fps,
    showVideo,
    showKeypoints,
    keypoints,
    config,
    drawFrame,
    drawKpts,
    setIsPlaying,
    setCurrentFrame,
  ]);

  useEffect(() => {
    if (!isPlaying && reader) {
      drawFrame(currentFrame);
      drawKpts(currentFrame);
    }
  }, [currentFrame, isPlaying, reader, drawFrame, drawKpts]);

  if (!metadata) {
    return (
      <Box
        w="100%"
        style={{ aspectRatio: `${w} / ${h}`, background: "#111" }}
      />
    );
  }

  return (
    <Box
      pos="relative"
      w="100%"
      style={{ aspectRatio: `${w} / ${h}`, background: "#111" }}
    >
      <canvas
        ref={videoRef}
        width={w}
        height={h}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <canvas
        ref={kptRef}
        width={w}
        height={h}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </Box>
  );
}
