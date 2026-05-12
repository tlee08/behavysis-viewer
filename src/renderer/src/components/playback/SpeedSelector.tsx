import { Select } from '@mantine/core'
import { useStore } from '../../store'

const SPEEDS = ['0.25', '0.5', '1', '1.5', '2']

export function SpeedSelector() {
  const { vidSpeed, setVidSpeed } = useStore()

  return (
    <Select
      data={SPEEDS.map((s) => ({ value: s, label: `${s}x` }))}
      value={vidSpeed.toString()}
      onChange={(v) => v && setVidSpeed(Number(v))}
      size="xs"
      w={70}
      allowDeselect={false}
    />
  )
}
