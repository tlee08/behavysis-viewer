import { useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Box, Text } from '@mantine/core'
import { useStore } from '../store'
import { ACTUAL_COLORS } from '../types'

const ROW_HEIGHT = 30

export function BoutsPanel(): React.ReactElement {
  const { bouts, selectedBoutId, selectBout, panToFrame, focusSizeFrames } = useStore()
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: bouts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  useEffect(() => {
    if (selectedBoutId !== null) {
      const index = bouts.findIndex((b) => b.id === selectedBoutId)
      if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' })
    }
  }, [selectedBoutId, bouts, virtualizer])

  const handleSelect = (id: number) => {
    selectBout(id)
    const bout = bouts.find((b) => b.id === id)
    if (bout) panToFrame(Math.max(0, bout.start - focusSizeFrames))
  }

  return (
    <Box
      ref={parentRef}
      h="100%"
      bg="dark.7"
      style={{ overflowY: 'auto', border: '1px solid var(--mantine-color-dark-6)', minWidth: 160 }}
    >
      <Box style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const bout = bouts[vItem.index]
          const selected = bout.id === selectedBoutId
          return (
            <Box
              key={bout.id}
              onClick={() => handleSelect(bout.id)}
              bg={selected ? '#1e3a5f' : 'transparent'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: vItem.size,
                transform: `translateY(${vItem.start}px)`,
                borderLeft: `4px solid ${ACTUAL_COLORS[bout.actual]}`,
                borderBottom: '1px solid var(--mantine-color-dark-6)',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
              }}
            >
              <Text size="xs" c={ACTUAL_COLORS[bout.actual]} ff="monospace">{bout.behav}</Text>
              <Text size="xs" c="dimmed" ff="monospace" ml={4}>#{bout.id}</Text>
              <Text size="xs" c="dark.4" ff="monospace" ml="auto">
                f{bout.start}-{bout.stop}
              </Text>
            </Box>
          )
        })}
      </Box>
      {bouts.length === 0 && (
        <Text p="sm" size="xs" c="dark.4">No bouts loaded</Text>
      )}
    </Box>
  )
}
