import { ActionIcon, Group } from "@mantine/core";
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
} from "@tabler/icons-react";
import { getSkipFrames, useStore } from "../../store";

export function PlaybackControls() {
  const { currentFrame, isPlaying, numFrames, setIsPlaying, setCurrentFrame } =
    useStore();
  const fps = useStore((s) => s.config!.fps);

  return (
    <Group gap={4}>
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() =>
          setCurrentFrame(Math.max(0, currentFrame - getSkipFrames(fps)))
        }
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
          setCurrentFrame(
            Math.min(numFrames - 1, currentFrame + getSkipFrames(fps)),
          )
        }
      >
        <IconPlayerSkipForwardFilled size={18} />
      </ActionIcon>
    </Group>
  );
}
