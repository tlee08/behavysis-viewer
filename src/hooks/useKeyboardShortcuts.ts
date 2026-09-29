import { useEffect, useRef } from "react";
import { getBoutById, getSkipFrames, useStore } from "../store";

const SUBBEHAV_KEYS = ["q", "w", "e", "r", "t", "y"];

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

      const toggleSubBehav = (index: number) => {
        if (selectedBoutId === null) return;
        const bout = getBoutById(selectedBoutId);
        if (!bout) return;
        const key = Object.keys(bout.userDefined)[index];
        if (key === undefined) return;
        state.updateBoutUserDefined(
          selectedBoutId,
          key,
          bout.userDefined[key] === 1 ? 0 : 1,
        );
      };

      const subIdx = SUBBEHAV_KEYS.indexOf(e.key.toLowerCase());
      if (subIdx !== -1) {
        toggleSubBehav(subIdx);
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
