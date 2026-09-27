import {
  Box,
  Divider,
  Radio,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { COLOR_MODES, COLOURMAP_NAMES } from "../lib/colors";
import type { ColorMapName, ColorMode } from "../lib/colors";
import { useStore } from "../store";

const SKIP_OPTS = [
  { value: "1", label: "1s" },
  { value: "2", label: "2s" },
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
  { value: "15", label: "15s" },
  { value: "20", label: "20s" },
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

const COLOURMAP_OPTS = COLOURMAP_NAMES.map((n) => ({
  value: n,
  label: n.charAt(0).toUpperCase() + n.slice(1),
}));

export function PlaybackSettingsPanel(): React.ReactElement {
  const {
    jumpSeconds,
    setJumpSeconds,
    focusSizeSeconds,
    setFocusSizeSeconds,
    vidSpeed,
    setVidSpeed,
    graphWindowSeconds,
    setGraphWindowSeconds,
    showVideo,
    setShowVideo,
    showKeypoints,
    setShowKeypoints,
    keypointPcutoff,
    setKeypointPcutoff,
    keypointRadius,
    setKeypointRadius,
    keypointColorMode,
    setKeypointColorMode,
    keypointColorMap,
    setKeypointColorMap,
  } = useStore();

  return (
    <Box p="xs" style={{ height: "100%", overflow: "auto" }}>
      <Stack gap="xs">
        <Select
          label="Skip"
          data={SKIP_OPTS}
          value={String(jumpSeconds)}
          onChange={(v) => v && setJumpSeconds(Number(v))}
          size="xs"
          allowDeselect={false}
        />
        <Select
          label="Focus"
          data={FOCUS_OPTS}
          value={String(focusSizeSeconds)}
          onChange={(v) => v && setFocusSizeSeconds(Number(v))}
          size="xs"
          allowDeselect={false}
        />
        <Select
          label="Speed"
          data={SPEED_OPTS}
          value={String(vidSpeed)}
          onChange={(v) => v && setVidSpeed(Number(v))}
          size="xs"
          allowDeselect={false}
        />
        <Select
          label="Window"
          data={WINDOW_OPTS}
          value={String(graphWindowSeconds)}
          onChange={(v) => v && setGraphWindowSeconds(Number(v))}
          size="xs"
          allowDeselect={false}
        />

        <Divider />

        <Switch
          label="Show video"
          checked={showVideo}
          onChange={(e) => setShowVideo(e.currentTarget.checked)}
        />
        <Switch
          label="Show keypoints"
          checked={showKeypoints}
          onChange={(e) => setShowKeypoints(e.currentTarget.checked)}
        />

        <Text size="xs" c="dimmed">
          Keypoint p-cutoff: {keypointPcutoff.toFixed(2)}
        </Text>
        <Slider
          value={keypointPcutoff}
          onChange={setKeypointPcutoff}
          min={0}
          max={1}
          step={0.01}
          size="xs"
          color="blue.4"
        />

        <Text size="xs" c="dimmed">
          Keypoint radius: {keypointRadius}px
        </Text>
        <Slider
          value={keypointRadius}
          onChange={setKeypointRadius}
          min={1}
          max={20}
          step={1}
          size="xs"
          color="blue.4"
        />

        <Divider />

        <Radio.Group
          label="Keypoint colour mode"
          value={keypointColorMode}
          onChange={(v) => setKeypointColorMode(v as ColorMode)}
          size="xs"
        >
          <Stack gap={4} mt={4}>
            {COLOR_MODES.map((m) => (
              <Radio key={m.value} value={m.value} label={m.label} />
            ))}
          </Stack>
        </Radio.Group>

        <Select
          label="Colour map"
          data={COLOURMAP_OPTS}
          value={keypointColorMap}
          onChange={(v) => v && setKeypointColorMap(v as ColorMapName)}
          size="xs"
          allowDeselect={false}
        />
      </Stack>
    </Box>
  );
}
