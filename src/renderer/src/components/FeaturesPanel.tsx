import { Box, MultiSelect, Select, Stack, Switch, Text } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useStore } from "../store";

export function FeaturesPanel() {
  const {
    paths,
    featureColumns,
    selectedFeatureColumns,
    setSelectedFeatureColumns,
    setFeatureData,
    featureYGlobal,
    setFeatureYGlobal,
    featureScaleMode,
    setFeatureScaleMode,
  } = useStore();

  const prevSelected = useRef<string[]>([]);

  useEffect(() => {
    if (!paths) return;
    const sel = selectedFeatureColumns;
    const prev = prevSelected.current;

    const same =
      sel.length === prev.length && sel.every((c, i) => c === prev[i]);
    if (same) return;

    prevSelected.current = [...sel];

    if (sel.length === 0) {
      setFeatureData({});
      return;
    }

    window.electron
      .parseFeaturesData(paths.featuresPath, sel)
      .then((data) => setFeatureData(data))
      .catch(() => setFeatureData({}));
  }, [selectedFeatureColumns, paths, setFeatureData]);

  return (
    <Box p="xs" style={{ height: "100%", overflow: "auto" }}>
      <Stack gap="xs">
        <MultiSelect
          label="Columns"
          placeholder="Search columns…"
          data={featureColumns.map((c) => ({ value: c, label: c }))}
          value={selectedFeatureColumns}
          onChange={(v) =>
            setSelectedFeatureColumns(v.slice(0, 10))
          }
          searchable
          clearable
          size="xs"
          maxValues={10}
        />

        <Switch
          label="Global Y-axis"
          checked={featureYGlobal}
          onChange={(e) => setFeatureYGlobal(e.currentTarget.checked)}
          size="xs"
        />

        <Select
          label="Scale"
          value={featureScaleMode}
          onChange={(v) =>
            v && setFeatureScaleMode(v as "raw" | "minmax" | "zscore")
          }
          data={[
            { value: "raw", label: "Raw" },
            { value: "minmax", label: "Min-Max" },
            { value: "zscore", label: "Z-Score" },
          ]}
          size="xs"
          allowDeselect={false}
        />
      </Stack>
    </Box>
  );
}
