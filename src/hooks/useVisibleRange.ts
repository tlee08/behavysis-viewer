import { useMemo } from "react";
import { useStore } from "../store";

export function useVisibleRange(): [number, number] {
  const currentFrame = useStore((s) => s.currentFrame);
  const graphWindowSeconds = useStore((s) => s.graphWindowSeconds);
  const numFrames = useStore((s) => s.numFrames);
  const fps = useStore((s) => s.config!.fps);

  return useMemo(() => {
    const half = Math.floor((graphWindowSeconds * fps) / 2);
    return [currentFrame - half, currentFrame + half];
  }, [currentFrame, graphWindowSeconds, numFrames, fps]);
}
