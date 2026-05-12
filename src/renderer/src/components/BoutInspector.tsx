import { useStore } from '../store'
import type { ActualValue } from '../types'
import { ACTUAL_COLORS } from '../types'

const ACTUAL_OPTIONS: { label: string; value: ActualValue }[] = [
  { label: 'IS behaviour', value: 1 },
  { label: 'NOT behaviour', value: 0 },
  { label: 'Not sure', value: -1 },
]

export function BoutInspector(): React.ReactElement {
  const { bouts, selectedBoutId, updateBoutActual, updateBoutUserDefined } = useStore()
  const bout = bouts.find((b) => b.id === selectedBoutId)

  if (!bout) {
    return (
      <div style={{ padding: 12, color: '#475569', fontSize: 12 }}>
        Select a bout to inspect
      </div>
    )
  }

  return (
    <div style={{ padding: 8, color: '#e2e8f0', fontSize: 13 }}>
      <div
        style={{
          fontWeight: 600,
          marginBottom: 8,
          color: ACTUAL_COLORS[bout.actual],
          fontFamily: 'monospace',
        }}
      >
        {bout.behav} <span style={{ color: '#64748b' }}>#{bout.id}</span>
      </div>

      {/* IS / NOT / UNSURE */}
      <fieldset style={{ border: '1px solid #1e293b', borderRadius: 4, padding: '4px 8px', marginBottom: 8 }}>
        <legend style={{ color: '#94a3b8', fontSize: 11 }}>Scoring</legend>
        {ACTUAL_OPTIONS.map(({ label, value }) => (
          <label
            key={value}
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 4 }}
          >
            <input
              type="radio"
              name={`actual-${bout.id}`}
              checked={bout.actual === value}
              onChange={() => updateBoutActual(bout.id, value)}
              style={{ accentColor: ACTUAL_COLORS[value] }}
            />
            <span style={{ color: ACTUAL_COLORS[value] }}>{label}</span>
          </label>
        ))}
      </fieldset>

      {/* User-defined sub-behaviours (if any) */}
      {Object.keys(bout.userDefined).length > 0 && (
        <fieldset style={{ border: '1px solid #1e293b', borderRadius: 4, padding: '4px 8px' }}>
          <legend style={{ color: '#94a3b8', fontSize: 11 }}>Sub-behaviours</legend>
          {Object.entries(bout.userDefined).map(([key, val]) => (
            <label
              key={key}
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 4 }}
            >
              <input
                type="checkbox"
                checked={val === 1}
                onChange={(e) => updateBoutUserDefined(bout.id, key, e.target.checked ? 1 : 0)}
                style={{ accentColor: '#22c55e' }}
              />
              <span>{key}</span>
            </label>
          ))}
        </fieldset>
      )}

      {/* Frame range info */}
      <div style={{ marginTop: 8, color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>
        frames {bout.start} – {bout.stop}
      </div>
    </div>
  )
}
