import { Slider } from '@mantine/core'
import { useStore } from '../../store'

export function TimelineSlider() {
  const { currentFrame, numFrames, panToFrame } = useStore()

  return (
    <Slider
      value={currentFrame}
      onChange={panToFrame}
      min={0}
      max={Math.max(numFrames - 1, 0)}
      step={1}
      label={null}
      size="sm"
      color="blue.4"
    />
  )
}
