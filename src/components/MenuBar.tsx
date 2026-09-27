import { Group, Button, Text } from "@mantine/core";
import { useState } from "react";
import { HelpModal } from "./HelpModal";

interface Props {
  onOpen: () => void;
  onSave: () => void;
  status: string;
}

export function MenuBar({ onOpen, onSave, status }: Props): React.ReactElement {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <Group gap="xs" px="xs" py={4} bg="dark.6" style={{ flexShrink: 0 }}>
        <Button variant="subtle" size="xs" onClick={onOpen}>
          Open
        </Button>
        <Button variant="subtle" size="xs" onClick={onSave}>
          Save
        </Button>
        <Button variant="subtle" size="xs" onClick={() => setHelpOpen(true)}>
          Help
        </Button>

        <Text
          size="xs"
          c="dimmed"
          ff="monospace"
          style={{ marginLeft: "auto", alignSelf: "center" }}
        >
          {status}
        </Text>
      </Group>

      <HelpModal opened={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
