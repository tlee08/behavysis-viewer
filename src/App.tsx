import { Box, Splitter, Tabs, Text } from "@mantine/core";
import { BoutInspector } from "./components/BoutInspector";
import { BoutsPanel } from "./components/BoutsPanel";
import { BoutTimeline } from "./components/BoutTimeline";
import { ClassifierGraph } from "./components/ClassifierGraph";
import { ClassifierPanel } from "./components/ClassifierPanel";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel";
import { FeatureGraph } from "./components/FeatureGraph";
import { FeaturesPanel } from "./components/FeaturesPanel";
import { MenuBar } from "./components/MenuBar";
import { PlaybackBar } from "./components/PlaybackBar";
import { PlaybackSettingsPanel } from "./components/PlaybackSettingsPanel";
import { VideoPane } from "./components/VideoPane";
import { useExperimentIO } from "./hooks/useExperimentIO";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useStore } from "./store";

export default function App(): React.ReactElement {
  const { reader, metadata, status, open, save } = useExperimentIO();
  const config = useStore((s) => s.config);
  const hasPredictions = useStore((s) => s.selectedBehaviours.length > 0);
  const hasFeatures = useStore((s) => s.selectedFeatureColumns.length > 0);
  useKeyboardShortcuts({ open, save });

  return (
    <Box
      bg="dark.7"
      c="dark.0"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      <MenuBar onOpen={open} onSave={save} status={status} />

      {!config ? (
        <Box
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text c="dimmed">{status}</Text>
        </Box>
      ) : (
        <Splitter orientation="vertical" style={{ flex: 1, minHeight: 0 }}>
          <Splitter.Pane defaultSize={100} min={20}>
            <Splitter orientation="horizontal" h="100%">
              <Splitter.Pane defaultSize={60} min={20}>
                <Box
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  <VideoPane reader={reader} metadata={metadata} />
                  <PlaybackBar />
                </Box>
              </Splitter.Pane>

              <Splitter.Pane defaultSize={40} min={20}>
                <Tabs
                  defaultValue="bouts"
                  h="100%"
                  styles={{
                    root: {
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    },
                    panel: { flex: 1, minHeight: 0 },
                  }}
                >
                  <Tabs.List>
                    <Tabs.Tab value="bouts">Bouts</Tabs.Tab>
                    <Tabs.Tab value="classifier">Classifier</Tabs.Tab>
                    <Tabs.Tab value="features">Features</Tabs.Tab>
                    <Tabs.Tab value="diagnostics">Diagnostics</Tabs.Tab>
                    <Tabs.Tab value="settings">Settings</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="bouts">
                    <Splitter orientation="vertical" h="100%">
                      <Splitter.Pane defaultSize={70} min={30}>
                        <BoutsPanel />
                      </Splitter.Pane>
                      <Splitter.Pane defaultSize={30} min="120px">
                        <BoutInspector />
                      </Splitter.Pane>
                    </Splitter>
                  </Tabs.Panel>

                  <Tabs.Panel value="classifier">
                    <ClassifierPanel />
                  </Tabs.Panel>

                  <Tabs.Panel value="features">
                    <FeaturesPanel />
                  </Tabs.Panel>

                  <Tabs.Panel value="diagnostics">
                    <DiagnosticsPanel />
                  </Tabs.Panel>

                  <Tabs.Panel value="settings">
                    <PlaybackSettingsPanel />
                  </Tabs.Panel>
                </Tabs>
              </Splitter.Pane>
            </Splitter>
          </Splitter.Pane>

          <Splitter.Pane defaultSize="300px" min="120px">
            <Splitter
              key={`${hasPredictions}-${hasFeatures}`}
              orientation="vertical"
              h="100%"
            >
              <Splitter.Pane defaultSize={100} min="60px">
                <BoutTimeline />
              </Splitter.Pane>

              {hasPredictions && (
                <Splitter.Pane defaultSize="90px" min="60px">
                  <ClassifierGraph />
                </Splitter.Pane>
              )}

              {hasFeatures && (
                <Splitter.Pane defaultSize="90px" min="60px">
                  <FeatureGraph />
                </Splitter.Pane>
              )}
            </Splitter>
          </Splitter.Pane>
        </Splitter>
      )}
    </Box>
  );
}
