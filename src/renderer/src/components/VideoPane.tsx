import { Box } from "@mantine/core";
import { useCallback, useEffect, useRef } from "react";
import { useStore } from "../store";
import type { FrameReader, FrameMetadata } from "../lib/frameReader";

interface Props {
  reader: FrameReader | null;
  metadata: FrameMetadata | null;
}

export function VideoPane({ reader, metadata }: Props): React.ReactElement {
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const keypointCanvasRef = useRef<HTMLCanvasElement>(null);
  const animHandle = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const expectedFrameRef = useRef<number>(0);

  const {
    config,
    keypointDefs,
    keypointFrames,
    showKeypoints,
    isPlaying,
    vidSpeed,
    currentFrame,
    setCurrentFrame,
    setIsPlaying,
  } = useStore();

  const fps = metadata?.fps ?? 15;
  const width = config?.widthPx ?? 640;
  const height = config?.heightPx ?? 480;

  const drawFrame = useCallback(
    (frameIdx: number) => {
      const canvas = videoCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (!reader || frameIdx < 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      reader.getFrame(frameIdx).then((frame) => {
        if (videoCanvasRef.current) {
          const c = videoCanvasRef.current.getContext("2d");
          if (c) {
            c.clearRect(0, 0, canvas.width, canvas.height);
            c.drawImage(frame, 0, 0, canvas.width, canvas.height);
          }
        }
        frame.close();
      }).catch((err) => {
        console.error("drawFrame failed for frame", frameIdx, err);
      });
    },
    [reader],
  );

  const drawKeypoints = useCallback(
    (frameNum: number) => {
      const canvas = keypointCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!showKeypoints || !keypointFrames[frameNum]) return;
      const frameKpts = keypointFrames[frameNum];
      const radius = config?.keypointRadius ?? 5;
      for (const def of keypointDefs) {
        const kpt = frameKpts[def.key];
        if (!kpt || kpt.likelihood < config!.keypointPcutoff) continue;
        const scaleX = canvas.width / (config?.widthPx ?? canvas.width);
        const scaleY = canvas.height / (config?.heightPx ?? canvas.height);
        ctx.beginPath();
        ctx.arc(kpt.x * scaleX, kpt.y * scaleY, radius, 0, Math.PI * 2);
        ctx.fillStyle = def.color;
        ctx.fill();
      }
    },
    [showKeypoints, keypointFrames, keypointDefs, config],
  );

  const callbacksRef = useRef({ drawFrame, drawKeypoints });
  callbacksRef.current = { drawFrame, drawKeypoints };

  useEffect(() => {
    if (!isPlaying || !reader || !metadata) return;

    lastTickRef.current = 0;
    expectedFrameRef.current = useStore.getState().currentFrame;

    const tick = (timestamp: number) => {
      const state = useStore.getState();
      if (!state.isPlaying) return;

      // Detect external seek (user clicked slider or pressed arrow while playing)
      if (Math.abs(state.currentFrame - expectedFrameRef.current) > 2) {
        lastTickRef.current = 0;
        expectedFrameRef.current = state.currentFrame;
      }

      if (!lastTickRef.current) lastTickRef.current = timestamp;
      const deltaSec = (timestamp - lastTickRef.current) / 1000;
      lastTickRef.current = timestamp;

      const advance = Math.max(1, Math.round(deltaSec * fps * vidSpeed));
      const next = Math.min(expectedFrameRef.current + advance, metadata.totalFrames - 1);
      expectedFrameRef.current = next;

      setCurrentFrame(next);
      callbacksRef.current.drawFrame(next);
      callbacksRef.current.drawKeypoints(next);

      if (next >= metadata.totalFrames - 1) {
        setIsPlaying(false);
        return;
      }

      animHandle.current = requestAnimationFrame(tick);
    };

    animHandle.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animHandle.current);
    };
  }, [isPlaying, reader, metadata, fps, vidSpeed, setIsPlaying, setCurrentFrame]);

  useEffect(() => {
    if (!isPlaying && reader) {
      callbacksRef.current.drawFrame(currentFrame);
      callbacksRef.current.drawKeypoints(currentFrame);
    }
  }, [currentFrame, isPlaying, reader]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animHandle.current);
    };
  }, []);

  if (!metadata) {
    return (
      <Box
        w="100%"
        style={{ aspectRatio: `${width} / ${height}`, background: "#111" }}
      />
    );
  }

  return (
    <Box
      pos="relative"
      w="100%"
      style={{ aspectRatio: `${width} / ${height}`, background: "#111" }}
    >
      <canvas
        ref={videoCanvasRef}
        width={width}
        height={height}
        style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
      />
      <canvas
        ref={keypointCanvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </Box>
  );
}
