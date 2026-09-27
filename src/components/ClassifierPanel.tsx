import { Box, MultiSelect } from "@mantine/core";
import { useStore } from "../store";

export function ClassifierPanel(): React.ReactElement {
  const predicted = useStore((s) => s.predicted);
  const selectedBehaviours = useStore((s) => s.selectedBehaviours);
  const setSelectedBehaviours = useStore((s) => s.setSelectedBehaviours);

  const behaviours = predicted?.behaviours ?? [];

  return (
    <Box p="xs">
      <MultiSelect
        label="Behaviours"
        placeholder="Select behaviours…"
        data={behaviours.map((b) => ({ value: b, label: b }))}
        value={selectedBehaviours}
        onChange={setSelectedBehaviours}
        searchable
        clearable
        disabled={predicted === null}
      />
    </Box>
  );
}
