import { Group, Kbd, Modal, Stack, Text } from "@mantine/core";

const MOD_KEY = navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: [MOD_KEY, "O"], label: "Open experiment" },
  { keys: [MOD_KEY, "S"], label: "Save" },
  { keys: ["Space"], label: "Play / pause" },
  { keys: ["←"], label: "Skip back" },
  { keys: ["→"], label: "Skip forward" },
  { keys: ["↑"], label: "Previous bout" },
  { keys: ["↓"], label: "Next bout" },
  { keys: ["K"], label: "Toggle keypoints" },
  { keys: ["R"], label: "Jump to selected bout" },
  { keys: ["1"], label: "Score: is behaviour" },
  { keys: ["2"], label: "Score: not behaviour" },
  { keys: ["3"], label: "Score: unsure" },
];

interface Props {
  opened: boolean;
  onClose: () => void;
}

export function HelpModal({ opened, onClose }: Props): React.ReactElement {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Keyboard shortcuts"
      centered
    >
      <Stack gap="sm">
        {SHORTCUTS.map((s) => (
          <Group key={s.label} gap="xs" wrap="nowrap">
            <Group gap={4} w={80} style={{ flexShrink: 0 }}>
              {s.keys.map((k, i) => (
                <Kbd key={i}>{k}</Kbd>
              ))}
            </Group>
            <Text size="sm">{s.label}</Text>
          </Group>
        ))}
      </Stack>
    </Modal>
  );
}
