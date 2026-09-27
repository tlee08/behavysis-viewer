import { Box, MultiSelect, Text } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";
import { ACTUAL_COLORS } from "../shared/types";
import { frameToTimecode, frameDurationSec } from "../lib/timecode";
import { useStore, getBoutById, filterBoutsByBehaviour } from "../store";
import { Panel } from "./Panel";

const ROW_HEIGHT = 30;

export function BoutsPanel(): React.ReactElement {
  const {
    bouts,
    selectedBoutId,
    selectBout,
    setCurrentFrame,
    focusSizeSeconds,
    filterBehaviours,
    setFilterBehaviours,
  } = useStore();
  const fps = useStore((s) => s.config!.fps);
  const parentRef = useRef<HTMLDivElement>(null);

  const behaviours = useMemo(
    () => [...new Set(bouts.map((b) => b.behav))].sort(),
    [bouts],
  );
  const visibleBouts = useMemo(
    () => filterBoutsByBehaviour(bouts, filterBehaviours),
    [bouts, filterBehaviours],
  );

  const virtualizer = useVirtualizer({
    count: visibleBouts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  useEffect(() => {
    if (selectedBoutId !== null) {
      const index = visibleBouts.findIndex((b) => b.id === selectedBoutId);
      if (index >= 0) virtualizer.scrollToIndex(index, { align: "auto" });
    }
  }, [selectedBoutId, visibleBouts, virtualizer]);

  const handleSelect = (id: number) => {
    selectBout(id);
    const bout = getBoutById(id);
    if (bout)
      setCurrentFrame(
        Math.max(0, bout.start - Math.round(focusSizeSeconds * fps)),
      );
  };

  return (
    <Panel
      style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <Box px="xs" py={4} style={{ flexShrink: 0 }}>
        <MultiSelect
          placeholder="Filter behaviours"
          data={behaviours.map((b) => ({ value: b, label: b }))}
          value={filterBehaviours}
          onChange={setFilterBehaviours}
          searchable
          clearable
          size="xs"
        />
      </Box>

      <Box
        ref={parentRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          borderTop: "1px solid var(--mantine-color-default-border)",
          minWidth: 160,
        }}
      >
        <Box
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((vItem) => {
            const bout = visibleBouts[vItem.index];
            const selected = bout.id === selectedBoutId;
            return (
              <Box
                key={bout.id}
                onClick={() => handleSelect(bout.id)}
                bg={selected ? "#1e3a5f" : "transparent"}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: vItem.size,
                  transform: `translateY(${vItem.start}px)`,
                  borderLeft: `4px solid ${ACTUAL_COLORS[bout.actual]}`,
                  borderBottom: "1px solid var(--mantine-color-dark-6)",
                  cursor: "pointer",
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px 8px",
                }}
              >
                <Text size="xs" c={ACTUAL_COLORS[bout.actual]} ff="monospace">
                  {bout.behav}
                </Text>
                <Text size="xs" c="dimmed" ff="monospace" ml={4}>
                  #{bout.id}
                </Text>
                <Text size="xs" c="dark.4" ff="monospace" ml="auto">
                  {frameToTimecode(bout.start, fps)} ·{" "}
                  {frameDurationSec(bout.start, bout.stop, fps)}s
                </Text>
              </Box>
            );
          })}
        </Box>
        {visibleBouts.length === 0 && (
          <Text p="sm" size="xs" c="dark.4">
            {bouts.length === 0 ? "No bouts loaded" : "No matching bouts"}
          </Text>
        )}
      </Box>
    </Panel>
  );
}
