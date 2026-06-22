import { ActionIcon, Group } from "@mantine/core";
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
} from "@tabler/icons-react";
import { useStore } from "../../store";

const jumpFrames = (fps: number, sec: number) => Math.round(sec * fps);

export function PlaybackControls() {
  const {
    currentFrame,
    isPlaying,
    numFrames,
    jumpSeconds,
    setIsPlaying,
    setCurrentFrame,
  } = useStore();
  const fps = useStore((s) => s.config?.fps ?? 15);

  return (
    <Group gap={4}>
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() =>
          setCurrentFrame(
            Math.max(0, currentFrame - jumpFrames(fps, jumpSeconds)),
          )
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
            Math.min(
              numFrames - 1,
              currentFrame + jumpFrames(fps, jumpSeconds),
            ),
          )
        }
      >
        <IconPlayerSkipForwardFilled size={18} />
      </ActionIcon>
    </Group>
  );
}
