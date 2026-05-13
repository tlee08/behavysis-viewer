import { Paper, Text, Radio, Stack, Checkbox, Group } from '@mantine/core'
import { useStore } from '../store'
import type { ActualValue } from '../../../shared/types'
import { ACTUAL_COLORS } from '../../../shared/types'

const ACTUAL_OPTIONS: { label: string; value: ActualValue }[] = [
  { label: 'IS behaviour', value: 1 },
  { label: 'NOT behaviour', value: 0 },
  { label: 'Not sure', value: -1 },
]

export function BoutInspector(): React.ReactElement {
  const { bouts, selectedBoutId, updateBoutActual, updateBoutUserDefined } = useStore()
  const bout = bouts.find((b) => b.id === selectedBoutId)

  if (!bout) {
    return (
      <Text c="dark.4" size="xs" p="sm">
        Select a bout to inspect
      </Text>
    )
  }

  return (
    <Stack gap="xs" p="xs">
      <Group gap="xs">
        <Text fw={600} ff="monospace" size="sm" c={ACTUAL_COLORS[bout.actual]}>
          {bout.behav}
        </Text>
        <Text size="sm" c="dimmed">#{bout.id}</Text>
      </Group>

      <Paper withBorder p="xs" bg="dark.7">
        <Text size="xs" c="dark.2" mb={4}>Scoring</Text>
        <Radio.Group
          value={bout.actual.toString()}
          onChange={(v) => updateBoutActual(bout.id, Number(v) as ActualValue)}
        >
          <Stack gap={4}>
            {ACTUAL_OPTIONS.map(({ label, value }) => (
              <Radio
                key={value}
                value={value.toString()}
                label={label}
                color={ACTUAL_COLORS[value]}
                size="xs"
              />
            ))}
          </Stack>
        </Radio.Group>
      </Paper>

      {Object.keys(bout.userDefined).length > 0 && (
        <Paper withBorder p="xs" bg="dark.7">
          <Text size="xs" c="dark.2" mb={4}>Sub-behaviours</Text>
          <Stack gap={4}>
            {Object.entries(bout.userDefined).map(([key, val]) => (
              <Checkbox
                key={key}
                label={key}
                checked={val === 1}
                onChange={(e) => updateBoutUserDefined(bout.id, key, e.currentTarget.checked ? 1 : 0)}
                color="green"
                size="xs"
              />
            ))}
          </Stack>
        </Paper>
      )}

      <Text size="xs" c="dimmed" ff="monospace">
        frames {bout.start} – {bout.stop}
      </Text>
    </Stack>
  )
}
