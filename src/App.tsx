import { Box, Tabs } from "@mantine/core";
import { Group, Panel, Separator } from "react-resizable-panels";
import { BoutInspector } from "./components/BoutInspector";
import { BoutsPanel } from "./components/BoutsPanel";
import { BoutTimeline } from "./components/BoutTimeline";
import { FeatureGraph } from "./components/FeatureGraph";
import { FeaturesPanel } from "./components/FeaturesPanel";
import { MenuBar } from "./components/MenuBar";
import { PlaybackBar } from "./components/playback/PlaybackBar";
import { VideoPane } from "./components/VideoPane";
import { useExperimentIO } from "./hooks/useExperimentIO";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export default function App(): React.ReactElement {
  const { reader, metadata, status, open, save } = useExperimentIO();
  useKeyboardShortcuts();

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
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <Box style={{ flexShrink: 0 }}>
              <VideoPane reader={reader} metadata={metadata} />
            </Box>
            <PlaybackBar />
            <Box style={{ flex: 1, overflow: "auto" }}>
              <BoutTimeline height={120} />
            </Box>
            <FeatureGraph height={90} />
          </Box>
        </Panel>
        <Separator
          style={{ width: 4, background: "var(--mantine-color-dark-5)" }}
        />
        <Panel defaultSize={40} minSize={20}>
          <Tabs
            defaultValue="bouts"
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
            styles={{
              root: { height: "100%" },
              panel: { flex: 1, overflow: "hidden" },
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="bouts">Behaviour Bouts</Tabs.Tab>
              <Tabs.Tab value="features">Features</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="bouts">
              <Box
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
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
            </Tabs.Panel>

            <Tabs.Panel value="features" style={{ height: "100%" }}>
              <FeaturesPanel />
            </Tabs.Panel>
          </Tabs>
        </Panel>
      </Group>
    </Box>
  );
}
