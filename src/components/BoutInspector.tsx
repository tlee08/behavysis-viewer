import {
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Radio,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { frameToSeconds, secondsToFrame } from "../lib/timecode";
import type { ActualValue } from "../shared/types";
import { ACTUAL_COLORS } from "../shared/types";
import { boutsOverlap, getBoutById, useStore } from "../store";
import { ConfirmModal } from "./ConfirmModal";
import { Panel } from "./Panel";

const ACTUAL_OPTIONS: { label: string; value: ActualValue }[] = [
  { label: "TRUE_POS — IS behaviour", value: 1 },
  { label: "FALSE_POS — NOT behaviour", value: -1 },
  { label: "UNSURE — not reviewed", value: -2 },
];

export function BoutInspector(): React.ReactElement {
  const {
    selectedBoutId,
    config,
    numFrames,
    bouts,
    currentFrame,
    interimBoutEdit,
    setInterimBoutEdit,
    updateBoutActual,
    updateBoutSubBehaviour,
    updateBoutRange,
    splitBout,
    deleteBout,
  } = useStore();

  const [splitOpen, setSplitOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const bout =
    selectedBoutId !== null ? getBoutById(selectedBoutId) : undefined;

  if (!bout) {
    return (
      <Panel p="xs">
        <Text c="dark.4" size="xs">
          Select a bout to inspect
        </Text>
      </Panel>
    );
  }

  const fps = config!.fps;
  const isEditing =
    interimBoutEdit !== null && interimBoutEdit.boutId === bout.id;
  const editStart = isEditing ? interimBoutEdit.start : bout.start;
  const editStop = isEditing ? interimBoutEdit.stop : bout.stop;
  const rangeValid = editStart <= editStop;
  const rangeOverlaps = boutsOverlap(
    bouts,
    bout.behav,
    editStart,
    editStop,
    bout.id,
  );
  const canSplit = currentFrame > bout.start && currentFrame < bout.stop;

  const handleFrameStart = (v: string | number) => {
    setInterimBoutEdit({ boutId: bout.id, start: Number(v), stop: editStop });
  };

  const handleFrameStop = (v: string | number) => {
    setInterimBoutEdit({ boutId: bout.id, start: editStart, stop: Number(v) });
  };

  const handleSecStart = (v: string | number) => {
    const f = secondsToFrame(v, fps);
    if (!isNaN(f)) {
      setInterimBoutEdit({ boutId: bout.id, start: f, stop: editStop });
    }
  };

  const handleSecStop = (v: string | number) => {
    const f = secondsToFrame(v, fps);
    if (!isNaN(f)) {
      setInterimBoutEdit({ boutId: bout.id, start: editStart, stop: f });
    }
  };

  const handleUpdate = () => {
    if (rangeValid && !rangeOverlaps) {
      updateBoutRange(bout.id, editStart, editStop);
      setInterimBoutEdit(null);
    }
  };

  const handleReset = () => {
    setInterimBoutEdit({
      boutId: bout.id,
      start: bout.start,
      stop: bout.stop,
    });
  };

  return (
    <>
      <Panel p="xs">
        <Stack gap="xs">
          <Group gap="xs">
            <Text
              fw={600}
              ff="monospace"
              size="sm"
              c={ACTUAL_COLORS[bout.actual]}
            >
              {bout.behav}
            </Text>
            <Text size="sm" c="dimmed">
              #{bout.id}
            </Text>
          </Group>

          <Group gap="xs">
            <Button
              size="xs"
              variant="default"
              color="blue"
              disabled={!canSplit}
              onClick={() => setSplitOpen(true)}
            >
              Split
            </Button>
            <Button
              size="xs"
              variant="default"
              color="red"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </Group>

          <Paper withBorder p="xs" bg="dark.7">
            <Text size="xs" c="dark.2" mb={4}>
              Scoring
            </Text>
            <Radio.Group
              value={bout.actual.toString()}
              onChange={(v) =>
                updateBoutActual(bout.id, Number(v) as ActualValue)
              }
            >
              <Stack gap={4}>
                {ACTUAL_OPTIONS.map(({ label, value }) => (
                  <Radio
                    key={value}
                    value={value.toString()}
                    label={label}
                    color={ACTUAL_COLORS[value]}
                    size="xs"
                  />
                ))}
              </Stack>
            </Radio.Group>
          </Paper>

          {Object.keys(bout.subBehaviour).length > 0 && (
            <Paper withBorder p="xs" bg="dark.7">
              <Text size="xs" c="dark.2" mb={4}>
                Sub-behaviours
              </Text>
              <Stack gap={4}>
                {Object.entries(bout.subBehaviour).map(([key, val]) => (
                  <Checkbox
                    key={key}
                    label={key}
                    checked={val === 1}
                    onChange={(e) =>
                      updateBoutSubBehaviour(
                        bout.id,
                        key,
                        e.currentTarget.checked ? 1 : 0,
                      )
                    }
                    color="green"
                    size="xs"
                  />
                ))}
              </Stack>
            </Paper>
          )}

          <Paper withBorder p="xs" bg="dark.7">
            <Text size="xs" c="dark.2" mb={4}>
              Edit range
            </Text>

            <Text size="xs" c="dimmed" mb={2}>
              Start
            </Text>
            <Group gap="xs" mb="xs" wrap="nowrap">
              <NumberInput
                placeholder="Frame"
                value={editStart}
                onChange={handleFrameStart}
                min={0}
                max={numFrames - 1}
                allowDecimal={false}
                allowNegative={false}
                hideControls
                size="xs"
                style={{ flex: 1 }}
              />
              <NumberInput
                placeholder="Seconds"
                value={frameToSeconds(editStart, fps)}
                onChange={handleSecStart}
                min={0}
                decimalScale={3}
                fixedDecimalScale
                allowNegative={false}
                hideControls
                size="xs"
                style={{ flex: 1 }}
              />
            </Group>

            <Text size="xs" c="dimmed" mb={2}>
              Stop
            </Text>
            <Group gap="xs" mb="xs" wrap="nowrap">
              <NumberInput
                placeholder="Frame"
                value={editStop}
                onChange={handleFrameStop}
                min={0}
                max={numFrames - 1}
                allowDecimal={false}
                allowNegative={false}
                hideControls
                size="xs"
                style={{ flex: 1 }}
              />
              <NumberInput
                placeholder="Seconds"
                value={frameToSeconds(editStop, fps)}
                onChange={handleSecStop}
                min={0}
                decimalScale={3}
                fixedDecimalScale
                allowNegative={false}
                hideControls
                size="xs"
                style={{ flex: 1 }}
              />
            </Group>

            {!rangeValid && (
              <Text size="xs" c="red" mb="xs">
                Stop must be at least start
              </Text>
            )}
            {rangeOverlaps && (
              <Text size="xs" c="red" mb="xs">
                Range overlaps an existing {bout.behav} bout
              </Text>
            )}

            <Group justify="flex-end" gap="xs">
              <Button variant="default" size="xs" onClick={handleReset}>
                Reset
              </Button>
              <Button
                size="xs"
                onClick={handleUpdate}
                disabled={!rangeValid || rangeOverlaps}
              >
                Update
              </Button>
            </Group>
          </Paper>
        </Stack>
      </Panel>

      <ConfirmModal
        opened={splitOpen}
        title="Split bout"
        message={`Split "${bout.behav}" (#${bout.id}) at frame ${currentFrame}?`}
        onCancel={() => setSplitOpen(false)}
        onConfirm={() => {
          setSplitOpen(false);
          splitBout(bout.id, currentFrame);
        }}
      />
      <ConfirmModal
        opened={deleteOpen}
        title="Delete bout"
        message={`Delete "${bout.behav}" (#${bout.id})?`}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          deleteBout(bout.id);
        }}
      />
    </>
  );
}
