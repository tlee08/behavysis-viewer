import { useStore } from '../store'
import { JUMP_FRAMES } from '../constants'

export function PlaybackBar(): React.ReactElement {
  const {
    currentFrame, isPlaying, vidSpeed, numFrames, config,
    showKeypoints, focusBout,
    setIsPlaying, setVidSpeed, setShowKeypoints, setFocusBout, panToFrame,
  } = useStore()

  const fps = config?.fps ?? 15

  return (
    <div style={{ display: 'flex', gap: 6, padding: '6px 4px', background: '#1e293b', flexShrink: 0, alignItems: 'center' }}>
      <button className="ctrl-btn" onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button className="ctrl-btn" onClick={() => panToFrame(Math.max(0, currentFrame - JUMP_FRAMES(fps)))}>
        ◀ 5s
      </button>
      <button className="ctrl-btn" onClick={() => panToFrame(Math.min(numFrames - 1, currentFrame + JUMP_FRAMES(fps)))}>
        5s ▶
      </button>

      <input
        type="range"
        min={0}
        max={Math.max(numFrames - 1, 0)}
        value={currentFrame}
        onChange={(e) => panToFrame(Number(e.target.value))}
        style={{ flex: 1 }}
      />

      <label style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="checkbox" checked={showKeypoints} onChange={(e) => setShowKeypoints(e.target.checked)} />
        Keypoints
      </label>
      <label style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="checkbox" checked={focusBout} onChange={(e) => setFocusBout(e.target.checked)} />
        Focus
      </label>
      <label style={{ fontSize: 11, color: '#94a3b8' }}>
        {Math.round(currentFrame / fps)}s
      </label>

      <select
        value={vidSpeed}
        onChange={(e) => setVidSpeed(Number(e.target.value))}
        style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 3, fontSize: 12 }}
      >
        {[0.25, 0.5, 1, 1.5, 2].map((s) => (
          <option key={s} value={s}>{s}x</option>
        ))}
      </select>
    </div>
  )
}
