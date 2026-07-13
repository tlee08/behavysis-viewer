import { Slider } from "@mantine/core";
import { useStore } from "../../store";

export function TimelineSlider() {
  const { currentFrame, numFrames, setCurrentFrame } = useStore();

  return (
    <Slider
      value={currentFrame}
      onChange={setCurrentFrame}
      min={0}
      max={Math.max(numFrames - 1, 0)}
      step={1}
      label={null}
      size="sm"
      color="blue.4"
    />
  );
}
