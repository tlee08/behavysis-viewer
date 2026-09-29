import { useEffect, useRef } from "react";
import { getBoutById, getSkipFrames, useStore } from "../store";

const SUBBEHAVIOUR_KEYS = ["q", "w", "e", "r", "t", "y"];

interface Props {
  open: () => void;
  save: () => void;
}

export function useKeyboardShortcuts({ open, save }: Props): void {
  const openRef = useRef(open);
  const saveRef = useRef(save);
  openRef.current = open;
  saveRef.current = save;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === "o") {
          e.preventDefault();
          openRef.current();
          return;
        }
        if (key === "s") {
          e.preventDefault();
          saveRef.current();
          return;
        }
        if (key === "=" || key === "+") {
          e.preventDefault();
          useStore.getState().zoomIn();
          return;
        }
        if (key === "-") {
          e.preventDefault();
          useStore.getState().zoomOut();
          return;
        }
        if (key === "0") {
          e.preventDefault();
          useStore.getState().resetZoom();
          return;
        }
      }

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
        showKeypoints,
        focusSizeSeconds,
      } = state;
      const fps = config!.fps;
      const skipFrames = getSkipFrames(fps);

      const toggleSubBehaviour = (index: number) => {
        if (selectedBoutId === null) return;
        const bout = getBoutById(selectedBoutId);
        if (!bout) return;
        const key = Object.keys(bout.subBehaviour)[index];
        if (key === undefined) return;
        state.updateBoutSubBehaviour(
          selectedBoutId,
          key,
          bout.subBehaviour[key] === 1 ? 0 : 1,
        );
      };

      const subIdx = SUBBEHAVIOUR_KEYS.indexOf(e.key.toLowerCase());
      if (subIdx !== -1) {
        toggleSubBehaviour(subIdx);
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          state.setIsPlaying(!isPlaying);
          break;
        case "ArrowLeft":
          e.preventDefault();
          state.setCurrentFrame(Math.max(0, currentFrame - skipFrames));
          break;
        case "ArrowRight":
          e.preventDefault();
          state.setCurrentFrame(
            Math.min(numFrames - 1, currentFrame + skipFrames),
          );
          break;
        case "/": {
          if (selectedBoutId === null) break;
          const bout = getBoutById(selectedBoutId);
          if (bout)
            state.setCurrentFrame(
              Math.max(0, bout.start - Math.round(focusSizeSeconds * fps)),
            );
          break;
        }
        case "k":
        case "K":
          state.setShowKeypoints(!showKeypoints);
          break;
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
            state.setCurrentFrame(
              Math.max(0, target.start - Math.round(focusSizeSeconds * fps)),
            );
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
