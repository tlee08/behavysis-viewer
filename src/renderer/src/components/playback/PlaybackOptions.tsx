import { Group, Switch } from '@mantine/core'
import { useStore } from '../../store'

export function PlaybackOptions() {
  const { showKeypoints, setShowKeypoints, focusBout, setFocusBout } = useStore()

  return (
    <Group gap="sm">
      <Switch
        label="Keypoints"
        checked={showKeypoints}
        onChange={(e) => setShowKeypoints(e.currentTarget.checked)}
        size="xs"
      />
      <Switch
        label="Focus"
        checked={focusBout}
        onChange={(e) => setFocusBout(e.currentTarget.checked)}
        size="xs"
      />
    </Group>
  )
}
