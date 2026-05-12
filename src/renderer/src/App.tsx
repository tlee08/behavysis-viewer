import { Box } from '@mantine/core'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { BoutInspector } from './components/BoutInspector'
import { BoutsPanel } from './components/BoutsPanel'
import { BoutTimeline } from './components/BoutTimeline'
import { DataGraphPaneECharts as DataGraphPane } from './components/DataGraphPaneECharts'
import { MenuBar } from './components/MenuBar'
import { PlaybackBar } from './components/playback'
import { VideoPane } from './components/VideoPane'
import { useExperimentIO } from './hooks/useExperimentIO'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useStore } from './store'
import { useEffect } from 'react'

export default function App(): React.ReactElement {
  const { videoUrl, status, open, save, saveJson } = useExperimentIO()
  useKeyboardShortcuts()

  const {
    currentFrame,
    bouts,
    graphSeries,
    focusBout,
    selectedBoutId,
    focusSizeFrames,
    setIsPlaying,
  } = useStore()

  useEffect(() => {
    if (!focusBout || selectedBoutId === null) return
    const bout = bouts.find((b) => b.id === selectedBoutId)
    if (!bout) return
    if (currentFrame > bout.stop + focusSizeFrames) {
      setIsPlaying(false)
    }
  }, [
    currentFrame,
    focusBout,
    selectedBoutId,
    bouts,
    focusSizeFrames,
    setIsPlaying,
  ])

  return (
    <Box
      bg="dark.7"
      c="dark.0"
      style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
    >
      <MenuBar
        onOpen={open}
        onSave={save}
        onSaveJson={saveJson}
        status={status}
      />

      <Group orientation="horizontal" style={{ flex: 1, overflow: 'hidden' }}>
        <Panel defaultSize={40} minSize={20}>
          <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box style={{ flexShrink: 0 }}>
              <VideoPane videoUrl={videoUrl} />
            </Box>

            <BoutTimeline height={120} />

            {graphSeries.map((s) => (
              <DataGraphPane key={s.label} series={s} height={100} />
            ))}

            <PlaybackBar />
          </Box>
        </Panel>

        <Separator style={{ width: 4, background: 'var(--mantine-color-dark-5)' }} />

        <Panel defaultSize={60} minSize={20}>
          <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box style={{ flex: 1, overflow: 'hidden' }}>
              <BoutsPanel />
            </Box>
            <Box
              bg="dark.7"
              style={{
                flexShrink: 0,
                minHeight: 140,
                borderTop: '1px solid var(--mantine-color-dark-6)',
              }}
            >
              <BoutInspector />
            </Box>
          </Box>
        </Panel>
      </Group>
    </Box>
  )
}
