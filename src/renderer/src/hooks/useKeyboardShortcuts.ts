import { useEffect } from "react";
import { getBoutById, useStore } from "../store";

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT") return;

      const state = useStore.getState();
      const {
        isPlaying,
        currentFrame,
        numFrames,
        bouts,
        selectedBoutId,
        config,
        videoMetadata,
        showKeypoints,
        focusSizeSeconds,
        jumpSeconds,
      } = state;
      const fps = config!.fps;

      switch (e.key) {
        case " ":
          e.preventDefault();
          state.setIsPlaying(!isPlaying);
          break;
        case "ArrowLeft":
          e.preventDefault();
          state.setCurrentFrame(
            Math.max(0, currentFrame - Math.round(jumpSeconds * fps)),
          );
          break;
        case "ArrowRight":
          e.preventDefault();
          state.setCurrentFrame(
            Math.min(
              numFrames - 1,
              currentFrame + Math.round(jumpSeconds * fps),
            ),
          );
          break;
        case "k":
        case "K":
          state.setShowKeypoints(!showKeypoints);
          break;
        case "r":
        case "R": {
          if (selectedBoutId === null) break;
          const bout = getBoutById(selectedBoutId);
          if (bout)
            state.setCurrentFrame(Math.max(0, bout.start - Math.round(focusSizeSeconds * fps)));
          break;
        }
        case "ArrowUp":
        case "ArrowDown": {
          e.preventDefault();
          const sorted = [...bouts].sort((a, b) => a.start - b.start);
          const curIdx = sorted.findIndex((b) => b.id === selectedBoutId);
          const dir = e.key === "ArrowDown" ? 1 : -1;
          const newIdx =
            curIdx === -1
              ? dir === 1
                ? 0
                : sorted.length - 1
              : Math.max(0, Math.min(curIdx + dir, sorted.length - 1));
          const target = sorted[newIdx];
          if (target) {
            state.selectBout(target.id);
            state.setCurrentFrame(Math.max(0, target.start - Math.round(focusSizeSeconds * fps)));
          }
          break;
        }
        case "1":
          if (selectedBoutId !== null)
            state.updateBoutActual(selectedBoutId, 1); // TRUE_POS
          break;
        case "2":
          if (selectedBoutId !== null)
            state.updateBoutActual(selectedBoutId, -1); // FALSE_POS
          break;
        case "3":
          if (selectedBoutId !== null)
            state.updateBoutActual(selectedBoutId, -2); // UNSURE
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
