
interface Props {
  onOpen: () => void
  onSave: () => void
  onSaveJson: () => void
  status: string
}

export function MenuBar({ onOpen, onSave, onSaveJson, status }: Props): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '4px 8px', background: '#1e293b', fontSize: 13, flexShrink: 0 }}>
      <button className="menu-btn" onClick={onOpen}>Open</button>
      <button className="menu-btn" onClick={onSave}>Save</button>
      <button className="menu-btn" onClick={onSaveJson}>Save bouts JSON</button>
      <span style={{ marginLeft: 'auto', color: '#64748b', fontFamily: 'monospace', fontSize: 11, alignSelf: 'center' }}>
        {status}
      </span>
    </div>
  )
}
