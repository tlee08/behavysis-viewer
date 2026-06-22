import { useMemo } from "react";
import { useStore } from "../store";

export function useVisibleRange(): [number, number] {
  const currentFrame = useStore((s) => s.currentFrame);
  const graphWindowSeconds = useStore((s) => s.graphWindowSeconds);
  const numFrames = useStore((s) => s.numFrames);
  const fps = useStore((s) => s.videoMetadata?.fps ?? s.config?.fps ?? 15);

  return useMemo(() => {
    const half = Math.floor((graphWindowSeconds * fps) / 2);
    return [
      Math.max(0, currentFrame - half),
      Math.min(numFrames - 1, currentFrame + half),
    ];
  }, [currentFrame, graphWindowSeconds, numFrames, fps]);
}
