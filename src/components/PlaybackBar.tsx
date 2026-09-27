import { ActionIcon, Box, Group, Slider, Text } from "@mantine/core";
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
} from "@tabler/icons-react";
import { frameToTimecode } from "../lib/timecode";
import { getSkipFrames, useStore } from "../store";

export function PlaybackBar() {
  const { currentFrame, isPlaying, numFrames, setIsPlaying, setCurrentFrame } =
    useStore();
  const fps = useStore((s) => s.config!.fps);
  const skip = getSkipFrames(fps);
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
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => setCurrentFrame(Math.max(0, currentFrame - skip))}
      >
        <IconPlayerSkipBackFilled size={18} />
      </ActionIcon>

      <ActionIcon
        variant="filled"
        color="blue"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? (
          <IconPlayerPauseFilled size={18} />
        ) : (
          <IconPlayerPlayFilled size={18} />
        )}
      </ActionIcon>

      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() =>
          setCurrentFrame(Math.min(numFrames - 1, currentFrame + skip))
        }
      >
        <IconPlayerSkipForwardFilled size={18} />
      </ActionIcon>

      <Box style={{ flex: 1, minWidth: 120 }}>
        <Slider
          value={currentFrame}
          onChange={setCurrentFrame}
          min={0}
          max={Math.max(numFrames - 1, 0)}
          step={1}
          label={null}
          size="sm"
          color="blue.4"
        />
      </Box>

      <Text size="xs" c="dimmed" ff="monospace" w={36} ta="right">
        {timeStr}
      </Text>
    </Group>
  );
}
