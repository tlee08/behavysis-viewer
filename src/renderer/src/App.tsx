import { useEffect } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { BoutInspector } from "./components/BoutInspector";
import { BoutsPanel } from "./components/BoutsPanel";
import { BoutTimeline } from "./components/BoutTimeline";
// import { DataGraphPane } from "./components/DataGraphPane";
import { DataGraphPaneECharts as DataGraphPane } from "./components/DataGraphPaneECharts";
import { MenuBar } from "./components/MenuBar";
import { PlaybackBar } from "./components/PlaybackBar";
import { VideoPane } from "./components/VideoPane";
import { useExperimentIO } from "./hooks/useExperimentIO";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useStore } from "./store";

export default function App(): React.ReactElement {
  const { videoUrl, status, open, save, saveJson } = useExperimentIO();
  useKeyboardShortcuts();

  const {
    currentFrame,
    bouts,
    graphSeries,
    focusBout,
    selectedBoutId,
    focusSizeFrames,
    setIsPlaying,
  } = useStore();

  useEffect(() => {
    if (!focusBout || selectedBoutId === null) return;
    const bout = bouts.find((b) => b.id === selectedBoutId);
    if (!bout) return;
    if (currentFrame > bout.stop + focusSizeFrames) {
      setIsPlaying(false);
    }
  }, [
    currentFrame,
    focusBout,
    selectedBoutId,
    bouts,
    focusSizeFrames,
    setIsPlaying,
  ]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      <MenuBar
        onOpen={open}
        onSave={save}
        onSaveJson={saveJson}
        status={status}
      />

      <Group orientation="horizontal" style={{ flex: 1, overflow: "hidden" }}>
        <Panel defaultSize={40} minSize={20}>
          <div
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <div style={{ flexShrink: 0 }}>
              <VideoPane videoUrl={videoUrl} />
            </div>

            <BoutTimeline height={120} />

            {graphSeries.map((s) => (
              <DataGraphPane key={s.label} series={s} height={100} />
            ))}

            <PlaybackBar />
          </div>
        </Panel>

        <Separator style={{ width: 4, background: "#334155" }} />

        <Panel defaultSize={60} minSize={20}>
          <div
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <div style={{ flex: 1, overflow: "hidden" }}>
              <BoutsPanel />
            </div>
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid #1e293b",
                background: "#0f172a",
                minHeight: 140,
              }}
            >
              <BoutInspector />
            </div>
          </div>
        </Panel>
      </Group>
    </div>
  );
}
