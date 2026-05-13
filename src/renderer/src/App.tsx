import { Box } from "@mantine/core";
import { useEffect } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { BoutInspector } from "./components/BoutInspector";
import { BoutsPanel } from "./components/BoutsPanel";
import { BoutTimeline } from "./components/BoutTimeline";
import { MenuBar } from "./components/MenuBar";
import { PlaybackBar } from "./components/playback/PlaybackBar";
import { VideoPane } from "./components/VideoPane";
import { useExperimentIO } from "./hooks/useExperimentIO";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useStore, getBoutById } from "./store";

export default function App(): React.ReactElement {
  const { videoUrl, status, open, save } = useExperimentIO();
  useKeyboardShortcuts();

  const {
    currentFrame,
    focusBout,
    selectedBoutId,
    focusSizeFrames,
    setIsPlaying,
  } = useStore();

  useEffect(() => {
    if (!focusBout || selectedBoutId === null) return;
    const bout = getBoutById(selectedBoutId);
    if (!bout) return;
    if (currentFrame > bout.stop + focusSizeFrames) {
      setIsPlaying(false);
    }
  }, [currentFrame, focusBout, selectedBoutId, focusSizeFrames, setIsPlaying]);

  return (
    <Box
      bg="dark.7"
      c="dark.0"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      <MenuBar onOpen={open} onSave={save} status={status} />

      <Group orientation="horizontal" style={{ flex: 1, overflow: "hidden" }}>
        <Panel defaultSize={60} minSize={20}>
          <Box
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <Box style={{ flexShrink: 0 }}>
              <VideoPane videoUrl={videoUrl} />
            </Box>
            <PlaybackBar />
            <Box style={{ flex: 1, overflow: "auto" }}>
              <BoutTimeline height={120} />
            </Box>
          </Box>
        </Panel>
        <Separator
          style={{ width: 4, background: "var(--mantine-color-dark-5)" }}
        />
        <Panel defaultSize={40} minSize={20}>
          <Box
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <Box style={{ flex: 1, overflow: "hidden" }}>
              <BoutsPanel />
            </Box>
            <Box
              bg="dark.7"
              style={{
                flexShrink: 0,
                minHeight: 140,
                borderTop: "1px solid var(--mantine-color-dark-6)",
              }}
            >
              <BoutInspector />
            </Box>
          </Box>
        </Panel>
      </Group>
    </Box>
  );
}
