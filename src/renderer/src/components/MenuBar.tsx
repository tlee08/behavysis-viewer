import { Group, Button, Text } from '@mantine/core'

interface Props {
  onOpen: () => void
  onSave: () => void
  status: string
}

export function MenuBar({ onOpen, onSave, status }: Props): React.ReactElement {
  return (
    <Group gap="xs" px="xs" py={4} bg="dark.6" style={{ flexShrink: 0 }}>
      <Button variant="subtle" size="xs" onClick={onOpen}>Open</Button>
      <Button variant="subtle" size="xs" onClick={onSave}>Save</Button>

      <Text
        size="xs"
        c="dimmed"
        ff="monospace"
        style={{ marginLeft: 'auto', alignSelf: 'center' }}
      >
        {status}
      </Text>
    </Group>
  )
}
