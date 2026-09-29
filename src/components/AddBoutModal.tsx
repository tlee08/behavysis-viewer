import {
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { frameToSeconds, secondsToFrame } from "../lib/timecode";
import { boutsOverlap, useStore } from "../store";

interface Props {
  onClose: () => void;
}

const LABEL_W = 56;

export function AddBoutModal({ onClose }: Props): React.ReactElement {
  const bouts = useStore((s) => s.bouts);
  const classifyBehaviour = useStore((s) => s.classifyBehaviour);
  const currentFrame = useStore((s) => s.currentFrame);
  const numFrames = useStore((s) => s.numFrames);
  const durFrames = useStore((s) => s.durFrames);
  const setDurFrames = useStore((s) => s.setDurFrames);
  const addBout = useStore((s) => s.addBout);
  const fps = useStore((s) => s.config!.fps);

  const [behav, setBehav] = useState<string | null>(null);
  const [start, setStart] = useState(currentFrame);
  const [dur, setDur] = useState(durFrames);

  const behaviours = Object.keys(classifyBehaviour);
  const stop = start + dur - 1;
  const overlaps = behav !== null && boutsOverlap(bouts, behav, start, stop);
  const canAdd = behav !== null && stop >= start && !overlaps;

  const setDurClamped = (n: number) => {
    const d = Math.max(1, Math.round(n));
    setDur(d);
    setDurFrames(d);
  };

  const handleStartFrames = (v: string | number) => {
    if (!Number.isFinite(Number(v))) return;
    setStart(Math.round(Number(v)));
  };

  const handleStopFrames = (v: string | number) => {
    if (!Number.isFinite(Number(v))) return;
    setDurClamped(Math.round(Number(v)) - start + 1);
  };

  const handleDurFrames = (v: string | number) => {
    if (!Number.isFinite(Number(v))) return;
    setDurClamped(Number(v));
  };

  const handleStartSeconds = (v: string | number) => {
    const f = secondsToFrame(v, fps);
    if (Number.isNaN(f)) return;
    setStart(f);
  };

  const handleStopSeconds = (v: string | number) => {
    const f = secondsToFrame(v, fps);
    if (Number.isNaN(f)) return;
    setDurClamped(f - start + 1);
  };

  const handleDurSeconds = (v: string | number) => {
    const f = secondsToFrame(v, fps);
    if (Number.isNaN(f)) return;
    setDurClamped(f);
  };

  const handleAdd = () => {
    if (!behav || !canAdd) return;
    addBout(behav, start, stop);
    onClose();
  };

  return (
    <Modal opened onClose={onClose} title="Add behaviour" centered>
      <Stack gap="xs">
        <Select
          label="Behaviour"
          placeholder="Select behaviour…"
          data={behaviours.map((b) => ({ value: b, label: b }))}
          value={behav}
          onChange={setBehav}
          size="xs"
        />

        <Box>
          <Group gap="xs" wrap="nowrap" mb={2}>
            <Box w={LABEL_W} />
            <Text size="xs" c="dimmed" ta="center" style={{ flex: 1 }}>
              Start
            </Text>
            <Text size="xs" c="dimmed" ta="center" style={{ flex: 1 }}>
              Stop
            </Text>
            <Text size="xs" c="dimmed" ta="center" style={{ flex: 1 }}>
              Duration
            </Text>
          </Group>

          <Group gap="xs" wrap="nowrap" mb={4}>
            <Text
              size="xs"
              c="dimmed"
              w={LABEL_W}
              style={{ alignSelf: "center" }}
            >
              Frames
            </Text>
            <NumberInput
              value={start}
              onChange={handleStartFrames}
              min={0}
              max={numFrames - 1}
              allowDecimal={false}
              allowNegative={false}
              hideControls
              size="xs"
              style={{ flex: 1 }}
            />
            <NumberInput
              value={stop}
              onChange={handleStopFrames}
              min={0}
              max={numFrames - 1}
              allowDecimal={false}
              allowNegative={false}
              hideControls
              size="xs"
              style={{ flex: 1 }}
            />
            <NumberInput
              value={dur}
              onChange={handleDurFrames}
              min={1}
              allowDecimal={false}
              allowNegative={false}
              hideControls
              size="xs"
              style={{ flex: 1 }}
            />
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Text
              size="xs"
              c="dimmed"
              w={LABEL_W}
              style={{ alignSelf: "center" }}
            >
              Seconds
            </Text>
            <NumberInput
              value={frameToSeconds(start, fps)}
              onChange={handleStartSeconds}
              min={0}
              decimalScale={3}
              fixedDecimalScale
              allowNegative={false}
              hideControls
              size="xs"
              style={{ flex: 1 }}
            />
            <NumberInput
              value={frameToSeconds(stop, fps)}
              onChange={handleStopSeconds}
              min={0}
              decimalScale={3}
              fixedDecimalScale
              allowNegative={false}
              hideControls
              size="xs"
              style={{ flex: 1 }}
            />
            <NumberInput
              value={frameToSeconds(dur, fps)}
              onChange={handleDurSeconds}
              min={0}
              decimalScale={3}
              fixedDecimalScale
              allowNegative={false}
              hideControls
              size="xs"
              style={{ flex: 1 }}
            />
          </Group>
        </Box>

        {overlaps && (
          <Text size="xs" c="red">
            Cannot overlap an existing {behav} bout
          </Text>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button size="xs" disabled={!canAdd} onClick={handleAdd}>
            Add
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
