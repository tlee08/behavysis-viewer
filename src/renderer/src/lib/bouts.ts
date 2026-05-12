import type { Bout, ActualValue } from '../types'

type FrameEntry = { actual: number; userDefined: Record<string, number> }
type FrameMap = Map<string, FrameEntry>

export function framesToBouts(
  frames: FrameMap[],
  behavNames: string[],
  predByBehav: Map<string, Int8Array>,
): Bout[] {
  const bouts: Bout[] = []
  let id = 0

  for (const behav of behavNames) {
    const preds = predByBehav.get(behav)
    if (!preds || preds.length !== frames.length) continue

    let runStart = -1
    for (let i = 0; i < frames.length; i++) {
      if (preds[i] === 1 && runStart === -1) {
        runStart = i
      } else if (preds[i] === 0 && runStart !== -1) {
        const entry = frames[runStart].get(behav)!
        bouts.push({
          id: id++,
          start: runStart,
          stop: i - 1,
          behav,
          actual: clampActual(entry.actual),
          userDefined: Object.fromEntries(
            Object.entries(entry.userDefined).map(([k, v]) => [k, clampActual(v)]),
          ),
        })
        runStart = -1
      }
    }
    if (runStart !== -1) {
      const entry = frames[runStart].get(behav)!
      bouts.push({
        id: id++,
        start: runStart,
        stop: frames.length - 1,
        behav,
        actual: clampActual(entry.actual),
        userDefined: Object.fromEntries(
          Object.entries(entry.userDefined).map(([k, v]) => [k, clampActual(v)]),
        ),
      })
    }
  }

  bouts.sort((a, b) => a.start - b.start || a.behav.localeCompare(b.behav))
  bouts.forEach((b, i) => { b.id = i })
  return bouts
}

function clampActual(v: number): ActualValue {
  if (v >= 1) return 1
  if (v <= -1) return -1
  return 0
}
