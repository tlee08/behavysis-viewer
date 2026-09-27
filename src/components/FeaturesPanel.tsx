import { Box, MultiSelect, Select, Stack, Switch } from "@mantine/core";
import { useEffect, useRef } from "react";
import { readFile } from "@tauri-apps/plugin-fs";
import { getFeatureFilePath } from "../lib/fileManager";
import { loadFeatureColumns, loadFeatureData } from "../lib/parquetIO";
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
    featureSets,
    activeFeatureSet,
    setActiveFeatureSet,
    setFeatureColumns,
  } = useStore();

  const prevSelected = useRef<string[]>([]);

  useEffect(() => {
    if (!paths || !activeFeatureSet) {
      setFeatureColumns([]);
      return;
    }

    const fp = getFeatureFilePath(
      paths.featuresDir,
      paths.name,
      activeFeatureSet,
    );

    readFile(fp)
      .then((bytes) => loadFeatureColumns(new Uint8Array(bytes)))
      .then(setFeatureColumns)
      .catch(() => setFeatureColumns([]));
  }, [activeFeatureSet, paths, setFeatureColumns]);

  useEffect(() => {
    if (!paths || !activeFeatureSet) return;
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

    const fp = getFeatureFilePath(
      paths.featuresDir,
      paths.name,
      activeFeatureSet,
    );

    readFile(fp)
      .then((bytes) => loadFeatureData(new Uint8Array(bytes), sel))
      .then((data) => setFeatureData(data))
      .catch(() => setFeatureData({}));
  }, [selectedFeatureColumns, paths, activeFeatureSet, setFeatureData]);

  return (
    <Box p="xs" style={{ height: "100%", overflow: "auto" }}>
      <Stack gap="xs">
        <Select
          label="Feature set"
          placeholder="Select a feature set…"
          data={featureSets.map((s) => ({ value: s, label: s }))}
          value={activeFeatureSet}
          onChange={(v) => setActiveFeatureSet(v)}
          size="xs"
          clearable
        />

        <MultiSelect
          label="Columns"
          placeholder="Search columns…"
          data={featureColumns.map((c) => ({ value: c, label: c }))}
          value={selectedFeatureColumns}
          onChange={(v) => setSelectedFeatureColumns(v.slice(0, 10))}
          searchable
          clearable
          size="xs"
          maxValues={10}
          disabled={!activeFeatureSet}
        />

        <Switch
          label="Global Y-axis"
          checked={featureYGlobal}
          onChange={(e) => setFeatureYGlobal(e.currentTarget.checked)}
          size="xs"
          disabled={!activeFeatureSet}
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
          disabled={!activeFeatureSet}
        />
      </Stack>
    </Box>
  );
}
