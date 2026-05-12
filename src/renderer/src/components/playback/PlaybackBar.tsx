import { Group, Box, Text } from '@mantine/core'
import { PlaybackControls } from './PlaybackControls'
import { TimelineSlider } from './TimelineSlider'
import { PlaybackOptions } from './PlaybackOptions'
import { SpeedSelector } from './SpeedSelector'
import { useStore } from '../../store'

export function PlaybackBar() {
  const { currentFrame, config } = useStore()
  const fps = config?.fps ?? 15
  const seconds = Math.round(currentFrame / fps)
  const timeStr = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`

  return (
    <Group
      gap="xs"
      px="xs"
      py={4}
      bg="dark.6"
      wrap="nowrap"
      align="center"
      style={{ flexShrink: 0 }}
    >
      <PlaybackControls />

      <Box style={{ flex: 1, minWidth: 120 }}>
        <TimelineSlider />
      </Box>

      <Text size="xs" c="dimmed" ff="monospace" w={36} ta="right">
        {timeStr}
      </Text>

      <SpeedSelector />
      <PlaybackOptions />
    </Group>
  )
}
