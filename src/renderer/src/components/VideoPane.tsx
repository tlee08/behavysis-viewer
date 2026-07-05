import { Box } from "@mantine/core";
import { useCallback, useEffect, useRef } from "react";
import type { FrameMetadata, FrameReader } from "../lib/frameReader";
import { useStore } from "../store";

interface Props {
  reader: FrameReader | null;
  metadata: FrameMetadata | null;
}

export function VideoPane({ reader, metadata }: Props) {
  const videoRef = useRef<HTMLCanvasElement>(null);
  const kptRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const clock = useRef(0);

  const {
    config,
    keypointDefs,
    keypointFrames,
    showVideo,
    showKeypoints,
    isPlaying,
    vidSpeed,
    currentFrame,
    setCurrentFrame,
    setIsPlaying,
  } = useStore();

  const fps = config!.fps;
  const w = config!.widthPx;
  const h = config!.heightPx;

  const drawFrame = useCallback(
    (i: number) => {
      const ctx = videoRef.current?.getContext("2d");
      if (!ctx || !reader) return;
      if (!showVideo) {
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, w, h);
        return;
      }
      reader
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
      if (!showKeypoints || !keypointFrames[i]) return;

      const r = config!.keypointRadius;
      const sx = w / config!.widthPx;
      const sy = h / config!.heightPx;

      for (const d of keypointDefs) {
        const k = keypointFrames[i][d.key];
        if (!k || k.likelihood < config!.keypointPcutoff) continue;
        ctx.beginPath();
        ctx.arc(k.x * sx, k.y * sy, r, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.fill();
      }
    },
    [showKeypoints, keypointFrames, keypointDefs, config, w, h],
  );

  useEffect(() => {
    if (!isPlaying || !reader || !metadata) return;

    const interval = 1000 / (fps * vidSpeed);
    let nextTime = 0;
    clock.current = useStore.getState().currentFrame;

    const tick = (now: number) => {
      if (!useStore.getState().isPlaying) return;
      if (!nextTime) nextTime = now;

      if (now >= nextTime) {
        const elapsed = now - nextTime + interval;
        const advance = Math.min(
          Math.max(1, Math.floor(elapsed / interval)),
          metadata.totalFrames - 1 - clock.current,
        );

        if (Math.abs(useStore.getState().currentFrame - clock.current) > 2) {
          clock.current = useStore.getState().currentFrame;
          nextTime = now;
        } else {
          clock.current += advance;
          nextTime += advance * interval;
          setCurrentFrame(clock.current);
          drawFrame(clock.current);
          drawKpts(clock.current);
          if (clock.current >= metadata.totalFrames - 1) {
            setIsPlaying(false);
            return;
          }
        }
      }
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [
    isPlaying,
    reader,
    metadata,
    fps,
    vidSpeed,
    showVideo,
    showKeypoints,
    keypointFrames,
    keypointDefs,
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
