import {
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Radio,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useEffect, useState } from "react";
import type { ActualValue } from "../../../shared/types";
import { ACTUAL_COLORS } from "../../../shared/types";
import { frameToTimecodeMs, timecodeToFrame } from "../lib/timecode";
import { getBoutById, useStore } from "../store";

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
    interimBoutEdit,
    setInterimBoutEdit,
    updateBoutActual,
    updateBoutUserDefined,
    updateBoutRange,
  } = useStore();
  const bout =
    selectedBoutId !== null ? getBoutById(selectedBoutId) : undefined;

  const [editStart, setEditStart] = useState<number>(0);
  const [editStop, setEditStop] = useState<number>(0);
  const [startTc, setStartTc] = useState("0:00.000");
  const [stopTc, setStopTc] = useState("0:00.000");

  useEffect(() => {
    if (bout) {
      const fps = config?.fps ?? 15;
      setEditStart(bout.start);
      setEditStop(bout.stop);
      setStartTc(frameToTimecodeMs(bout.start, fps));
      setStopTc(frameToTimecodeMs(bout.stop, fps));
      setInterimBoutEdit({
        boutId: bout.id,
        start: bout.start,
        stop: bout.stop,
      });
    }
  }, [bout?.id]);

  // pull timeline drag edits ← interim store
  useEffect(() => {
    if (!bout || !interimBoutEdit || interimBoutEdit.boutId !== bout.id) return;
    const fps = config?.fps ?? 15;
    if (interimBoutEdit.start !== editStart) {
      setEditStart(interimBoutEdit.start);
      setStartTc(frameToTimecodeMs(interimBoutEdit.start, fps));
    }
    if (interimBoutEdit.stop !== editStop) {
      setEditStop(interimBoutEdit.stop);
      setStopTc(frameToTimecodeMs(interimBoutEdit.stop, fps));
    }
  }, [interimBoutEdit]);

  if (!bout) {
    return (
      <Text c="dark.4" size="xs" p="sm">
        Select a bout to inspect
      </Text>
    );
  }

  const fps = config?.fps ?? 15;
  const rangeValid = editStart <= editStop;

  const handleFrameStart = (v: string | number) => {
    const f = Number(v);
    setEditStart(f);
    setStartTc(frameToTimecodeMs(f, fps));
    setInterimBoutEdit({ boutId: bout.id, start: f, stop: editStop });
  };

  const handleFrameStop = (v: string | number) => {
    const f = Number(v);
    setEditStop(f);
    setStopTc(frameToTimecodeMs(f, fps));
    setInterimBoutEdit({ boutId: bout.id, start: editStart, stop: f });
  };

  const handleTcStart = (v: string) => {
    setStartTc(v);
    const f = timecodeToFrame(v, fps);
    if (!isNaN(f)) {
      setEditStart(f);
      setInterimBoutEdit({ boutId: bout.id, start: f, stop: editStop });
    }
  };

  const handleTcStop = (v: string) => {
    setStopTc(v);
    const f = timecodeToFrame(v, fps);
    if (!isNaN(f)) {
      setEditStop(f);
      setInterimBoutEdit({ boutId: bout.id, start: editStart, stop: f });
    }
  };

  const handleUpdate = () => {
    if (rangeValid) {
      updateBoutRange(bout.id, editStart, editStop);
      setInterimBoutEdit(null);
    }
  };

  const handleReset = () => {
    setEditStart(bout.start);
    setEditStop(bout.stop);
    setStartTc(frameToTimecodeMs(bout.start, fps));
    setStopTc(frameToTimecodeMs(bout.stop, fps));
    setInterimBoutEdit(null);
  };

  return (
    <Stack gap="xs" p="xs">
      <Group gap="xs">
        <Text fw={600} ff="monospace" size="sm" c={ACTUAL_COLORS[bout.actual]}>
          {bout.behav}
        </Text>
        <Text size="sm" c="dimmed">
          #{bout.id}
        </Text>
      </Group>

      <Paper withBorder p="xs" bg="dark.7">
        <Text size="xs" c="dark.2" mb={4}>
          Scoring
        </Text>
        <Radio.Group
          value={bout.actual.toString()}
          onChange={(v) => updateBoutActual(bout.id, Number(v) as ActualValue)}
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

      {Object.keys(bout.userDefined).length > 0 && (
        <Paper withBorder p="xs" bg="dark.7">
          <Text size="xs" c="dark.2" mb={4}>
            Sub-behaviours
          </Text>
          <Stack gap={4}>
            {Object.entries(bout.userDefined).map(([key, val]) => (
              <Checkbox
                key={key}
                label={key}
                checked={val === 1}
                onChange={(e) =>
                  updateBoutUserDefined(
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
          <TextInput
            placeholder="M:SS.mmm"
            value={startTc}
            onChange={(e) => handleTcStart(e.currentTarget.value)}
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
          <TextInput
            placeholder="M:SS.mmm"
            value={stopTc}
            onChange={(e) => handleTcStop(e.currentTarget.value)}
            size="xs"
            style={{ flex: 1 }}
          />
        </Group>

        {!rangeValid && (
          <Text size="xs" c="red" mb="xs">
            Stop must be at least start
          </Text>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={handleReset}>
            Reset
          </Button>
          <Button size="xs" onClick={handleUpdate} disabled={!rangeValid}>
            Update
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}
