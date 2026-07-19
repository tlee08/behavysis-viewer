import {
  ActionIcon,
  Divider,
  Group,
  Popover,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useStore } from "../../store";

const SKIP_OPTS = [
  { value: "1", label: "1s" },
  { value: "2", label: "2s" },
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
  { value: "15", label: "15s" },
  { value: "20", label: "20s" },
];

const SPEED_OPTS = [
  "0.1",
  "0.25",
  "0.5",
  "0.75",
  "1",
  "1.25",
  "1.5",
  "2",
  "3",
  "4",
  "5",
  "10",
].map((s) => ({ value: s, label: `${s}x` }));

const WINDOW_OPTS = [
  { value: "2", label: "2s" },
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
  { value: "20", label: "20s" },
  { value: "30", label: "30s" },
  { value: "60", label: "60s" },
];

const FOCUS_OPTS = [
  { value: "0", label: "0s" },
  { value: "0.5", label: "0.5s" },
  { value: "1", label: "1s" },
  { value: "1.5", label: "1.5s" },
  { value: "2", label: "2s" },
  { value: "3", label: "3s" },
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
  { value: "15", label: "15s" },
];

export function PlaybackSettingsPopover() {
  const {
    jumpSeconds,
    setJumpSeconds,
    vidSpeed,
    setVidSpeed,
    graphWindowSeconds,
    setGraphWindowSeconds,
    showVideo,
    setShowVideo,
    showKeypoints,
    setShowKeypoints,
    focusSizeSeconds,
    setFocusSizeSeconds,
    keypointPcutoff,
    setKeypointPcutoff,
    keypointRadius,
    setKeypointRadius,
  } = useStore();
  const pcutoff = keypointPcutoff;
  const radius = keypointRadius;

  return (
    <Popover position="bottom-end" shadow="md" width={180}>
      <Popover.Target>
        <ActionIcon variant="subtle" color="gray">
          <IconSettings size={18} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" w={44}>
              Skip
            </Text>
            <Select
              data={SKIP_OPTS}
              value={jumpSeconds.toString()}
              onChange={(v) => v && setJumpSeconds(Number(v))}
              size="xs"
              w={62}
              allowDeselect={false}
            />
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" w={44}>
              Focus
            </Text>
            <Select
              data={FOCUS_OPTS}
              value={focusSizeSeconds.toString()}
              onChange={(v) => v && setFocusSizeSeconds(Number(v))}
              size="xs"
              w={62}
              allowDeselect={false}
            />
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" w={44}>
              Speed
            </Text>
            <Select
              data={SPEED_OPTS}
              value={vidSpeed.toString()}
              onChange={(v) => v && setVidSpeed(Number(v))}
              size="xs"
              w={62}
              allowDeselect={false}
            />
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" w={44}>
              Window
            </Text>
            <Select
              data={WINDOW_OPTS}
              value={graphWindowSeconds.toString()}
              onChange={(v) => v && setGraphWindowSeconds(Number(v))}
              size="xs"
              w={62}
              allowDeselect={false}
            />
          </Group>
          <Divider />
          <Switch
            label="Video"
            checked={showVideo}
            onChange={(e) => setShowVideo(e.currentTarget.checked)}
            size="xs"
          />
          <Switch
            label="Keypoints"
            checked={showKeypoints}
            onChange={(e) => setShowKeypoints(e.currentTarget.checked)}
            size="xs"
          />
          <Group gap={4} ml={28}>
            <Slider
              value={pcutoff}
              onChange={setKeypointPcutoff}
              min={0}
              max={1}
              step={0.01}
              size="xs"
              w={80}
              color="blue.4"
              label={null}
            />
            <Text size="xs" c="dimmed">
              {pcutoff.toFixed(2)}
            </Text>
          </Group>
          <Group gap={4} ml={28}>
            <Slider
              value={radius}
              onChange={setKeypointRadius}
              min={1}
              max={20}
              step={1}
              size="xs"
              w={80}
              color="blue.4"
              label={null}
            />
            <Text size="xs" c="dimmed">
              {radius.toFixed(0)}px
            </Text>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
