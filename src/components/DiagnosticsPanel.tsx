import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { Panel } from "./Panel";
import { useStore } from "../store";

export function DiagnosticsPanel(): React.ReactElement {
  const diagnostics = useStore((s) => s.diagnostics);

  if (diagnostics.length === 0) {
    return (
      <Panel p="xs">
        <Text size="xs" c="dimmed">
          No experiment loaded.
        </Text>
      </Panel>
    );
  }

  return (
    <Panel p="xs">
      <Stack gap="sm">
        {diagnostics.map((d) => (
          <Group key={d.label} gap="xs" wrap="nowrap" align="flex-start">
            <ThemeIcon
              size="sm"
              variant="light"
              color={d.loaded ? "green" : "red"}
              style={{ marginTop: 2 }}
            >
              {d.loaded ? <IconCheck size={14} /> : <IconX size={14} />}
            </ThemeIcon>
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <Text size="xs" fw={500}>
                {d.label}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                ff="monospace"
                style={{ wordBreak: "break-all" }}
              >
                {d.path}
              </Text>
              {d.detail && (
                <Text
                  size="xs"
                  c="red.6"
                  ff="monospace"
                  style={{ wordBreak: "break-all" }}
                >
                  {d.detail}
                </Text>
              )}
            </Stack>
          </Group>
        ))}
      </Stack>
    </Panel>
  );
}
