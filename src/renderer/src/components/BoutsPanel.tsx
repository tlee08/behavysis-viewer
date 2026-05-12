import { useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
    <div ref={parentRef} style={{ overflowY: 'auto', height: '100%', background: '#0f172a', border: '1px solid #1e293b', minWidth: 160 }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const bout = bouts[vItem.index]
          const isSelected = bout.id === selectedBoutId
          return (
            <div
              key={bout.id}
              onClick={() => handleSelect(bout.id)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: vItem.size,
                transform: `translateY(${vItem.start}px)`,
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'monospace',
                background: isSelected ? '#1e3a5f' : 'transparent',
                borderLeft: `4px solid ${ACTUAL_COLORS[bout.actual]}`,
                borderBottom: '1px solid #1e293b',
                color: '#e2e8f0',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span style={{ color: ACTUAL_COLORS[bout.actual] }}>{bout.behav}</span>
              {' '}
              <span style={{ color: '#64748b' }}>#{bout.id}</span>
              {' '}
              <span style={{ color: '#475569', fontSize: 10, marginLeft: 'auto' }}>
                f{bout.start}-{bout.stop}
              </span>
            </div>
          )
        })}
      </div>
      {bouts.length === 0 && (
        <div style={{ padding: 12, color: '#475569', fontSize: 12 }}>No bouts loaded</div>
      )}
    </div>
  )
}
