import { Group, ActionIcon } from '@mantine/core'
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
} from '@tabler/icons-react'
import { useStore } from '../../store'
import { JUMP_FRAMES } from '../../constants'

export function PlaybackControls() {
  const { currentFrame, isPlaying, numFrames, config, setIsPlaying, panToFrame } = useStore()
  const fps = config?.fps ?? 15

  return (
    <Group gap={4}>
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => panToFrame(Math.max(0, currentFrame - JUMP_FRAMES(fps)))}
      >
        <IconPlayerSkipBackFilled size={18} />
      </ActionIcon>

      <ActionIcon
        variant="filled"
        color="blue"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying
          ? <IconPlayerPauseFilled size={18} />
          : <IconPlayerPlayFilled size={18} />
        }
      </ActionIcon>

      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => panToFrame(Math.min(numFrames - 1, currentFrame + JUMP_FRAMES(fps)))}
      >
        <IconPlayerSkipForwardFilled size={18} />
      </ActionIcon>
    </Group>
  )
}
