import { Group, Box, Text } from "@mantine/core";
import { PlaybackControls } from "./PlaybackControls";
import { TimelineSlider } from "./TimelineSlider";
import { PlaybackSettingsPopover } from "./PlaybackSettingsPopover";
import { frameToTimecode } from "../../lib/timecode";
import { useStore } from "../../store";

export function PlaybackBar() {
  const { currentFrame } = useStore();
  const fps = useStore((s) => s.videoMetadata?.fps ?? s.config?.fps ?? 15);
  const timeStr = frameToTimecode(currentFrame, fps);

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

      <PlaybackSettingsPopover />
    </Group>
  );
}
