# Code Review: Behavysis Viewer

**Stack:** Electron + React + Zustand + TypeScript  
**Total Source LOC:** ~1,450 lines  
**Guidelines:** Karpathy Principles (simplicity, minimalism, surgical changes)

---

## Executive Summary

The codebase is **well-structured** for its purpose. It's already leaner than most Electron apps. The architecture is sound: clean IPC layer, Zustand for state, WASM-based parquet parsing. 

**However**, there are opportunities for improvement in:
1. **Hook cohesion** - `useExperimentIO` mixes I/O with React state
2. **Inline styles** - 40+ inline style objects reduce maintainability
3. **File structure** - `parseParquet.ts` at 322 lines is doing too much
4. **Type definitions** - Global `Window.electron` in component file

**Verdict:** This is already a good codebase. The recommendations below are **incremental improvements**, not rewrites.

---

## Assessment by Karpathy Principles

### 1. Simplicity First ✓ (Good)

The codebase already follows this well:
- No over-engineered state management (simple Zustand)
- No unnecessary abstractions
- No speculative flexibility
- No error handling for impossible scenarios

**What's good:**
- `ipc.ts` - 40 lines, does exactly what it needs to
- `bouts.ts` - 61 lines, focused run-length encoding
- `colors.ts` - 22 lines, single purpose

### 2. Surgical Changes ✓ (Good)

The code generally doesn't touch unrelated code. One exception: the global type declaration in `App.tsx`.

### 3. Goal-Driven Execution ⚠️ (Could be clearer)

Success criteria aren't defined for some complex operations. For example, `parseParquet.ts` has complex parsing logic without clear validation points.

---

## Critical Issues (Fix First)

### Issue 1: Global Type Declaration in Wrong Place

**File:** `src/renderer/src/App.tsx:14-18`

```typescript
declare global {
  interface Window {
    electron: import('../../../preload').ElectronAPI
  }
}
```

**Problem:** This is a global type declaration inside a component file. It should be in `types.ts` or a global declaration file.

**Fix:** Move to `src/renderer/src/types.ts`:

```typescript
export declare global {
  interface Window {
    electron: import('../../preload').ElectronAPI
  }
}
```

**Why:** Components should not define global types. This creates hidden dependencies.

---

### Issue 2: useExperimentIO Hook is Leaky

**File:** `src/renderer/src/hooks/useExperimentIO.ts`

**Problem:** This hook is doing too much:
1. Managing React state (`videoUrl`, `status`)
2. Raw parquet caching (`rawParquet`, `rawTable`)
3. File I/O orchestration
4. Status management

The `rawParquet` and `rawTable` ref pattern is unnecessary complexity. The hook returns these values but they're never used by the component.

**Current code:**
```typescript
export function useExperimentIO() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('Open a config JSON...')
  const [rawParquet, setRawParquet] = useState<Uint8Array | null>(null)  // Never used outside
  const [rawTable, setRawTable] = useState<Table | null>(null)  // Never used outside
  // ...
}
```

**Fix:** Keep only what's needed by the UI:

```typescript
export function useExperimentIO() {
  const [status, setStatus] = useState('Open a config JSON...')
  const { loadExperiment, paths, bouts } = useStore()
  const rawTableRef = useRef<Table | null>(null)

  const open = useCallback(async () => {
    // ... logic that stores rawTable in ref, not state
  }, [])

  const save = useCallback(async () => {
    // ... use rawTableRef.current
  }, [])

  // Return only what UI needs
  return { status, open, save }
}
```

**Why:** State changes trigger re-renders. `rawTable` is only needed for save operations, not for UI.

---

### Issue 3: parseParquet.ts is Too Large

**File:** `src/renderer/src/lib/parseParquet.ts` (322 lines)

**Problem:** This file handles:
1. WASM module loading
2. Arrow table conversion
3. Behaviour parsing
4. Keypoint parsing
5. Saving/serialization

**Fix:** Split into focused modules:

```
src/renderer/src/lib/
  parquet/
    index.ts          # Re-exports only
    arrow.ts          # toArrowTable, toNumber (30 lines)
    behaviour.ts      # parseBehavParquet, boutsToBehavParquet (120 lines)
    keypoints.ts      # parseKeypointsParquet (100 lines)
    wasm.ts           # getParquetMod lazy loader (20 lines)
```

**Why:** Each module should have a single reason to change. Behaviour parsing changes for different data formats; keypoint parsing changes for different keypoint schemas.

---

## Medium Issues (Fix When Convenient)

### Issue 4: Inline Styles Everywhere

**Count:** 40+ inline style objects across components

**Problem:** Hard to maintain, no CSS variable support, duplicated values.

**Example from `App.tsx:40`:**
```typescript
<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
```

**Fix:** Extract to `styles.css`:

```css
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

**Priority:** Low-medium. The current inline styles work fine. Only refactor if you're touching those components anyway.

---

### Issue 5: Magic Numbers Without Context

**File:** Various

**Examples:**
- `BoutTimeline.tsx:9` - `ROW_HEIGHT = 24`
- `BoutTimeline.tsx:10` - `LABEL_WIDTH = 80`
- `VideoPane.tsx:108` - `aspectRatio: '480/320'`
- `useKeyboardShortcuts.ts:4` - `JUMP_FRAMES = (fps) => Math.round(5 * fps)`

**Fix:** Create `src/renderer/src/constants.ts`:

```typescript
// Timeline
export const TIMELINE_ROW_HEIGHT = 24
export const TIMELINE_LABEL_WIDTH = 80

// Video
export const VIDEO_ASPECT_RATIO = '480/320'

// Navigation
export const JUMP_SECONDS = 5

// Defaults
export const DEFAULT_FPS = 15
export const DEFAULT_FOCUS_PADDING = 5
```

**Why:** Makes intent explicit. `JUMP_SECONDS = 5` is clearer than `Math.round(5 * fps)`.

---

### Issue 6: Unused Ref in VideoPane

**File:** `src/renderer/src/components/VideoPane.tsx:26`

```typescript
const rafHandle = useRef<number>(0)
```

**Problem:** This ref is assigned in `drawKeypoints` but only used in cleanup. The `rvcHandle` is the one that actually matters.

**Fix:** Remove `rafHandle` entirely. The cleanup only needs `rvcHandle`.

---

### Issue 7: Hardcoded Colors

**Count:** Colors like `#0f172a`, `#1e293b`, `#e2e8f0` appear 20+ times.

**Fix:** Add CSS variables in `styles.css`:

```css
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #1a1a2e;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border-color: #334155;
  --accent-blue: #60a5fa;
  --color-success: #22c55e;
  --color-danger: #ef4444;
  --color-warning: #eab308;
}
```

Then update `ACTUAL_COLORS` in `types.ts` to reference these:

```typescript
export const ACTUAL_COLORS: Record<ActualValue, string> = {
  1: 'var(--color-success)',
  0: 'var(--color-danger)',
  [-1]: 'var(--color-warning)',
}
```

---

## Architectural Observations

### What's Working Well

1. **Clean IPC layer** - `ipc.ts` is a perfect example of minimal, focused code
2. **Good state management** - Zustand is used appropriately without over-fetching
3. **Separation of concerns** - Main process does I/O, renderer does parsing
4. **Type safety** - Strong TypeScript usage throughout
5. **Error boundary** - Good practice in `main.tsx`

### What Could Be Better

1. **Testability** - Complex logic in `parseParquet.ts` has no unit tests
2. **Validation** - File paths aren't validated before use
3. **Error feedback** - User only sees status messages, no detailed error info

---

## Recommendations Summary

### High Priority (Do These)

1. **Move global type declaration** from `App.tsx` to `types.ts`
2. **Fix useExperimentIO state leakage** - Use refs for non-UI state
3. **Split parseParquet.ts** into focused modules

### Medium Priority (Nice to Have)

4. **Create constants.ts** for magic numbers
5. **Remove unused rafHandle** from VideoPane
6. **Add CSS variables** for colors (when touching styles anyway)

### Low Priority (Don't Do Unless Needed)

7. **Convert inline styles to CSS** - Only when modifying those components
8. **Add input validation** - Check file extensions before parsing
9. **Unit tests** - For `bouts.ts` and parsing logic

---

## Proposed File Structure (Incremental)

Current structure is good. Only minor changes:

```
src/renderer/src/
  types.ts              # Add global Window.electron declaration
  constants.ts          # NEW: Extract magic numbers
  store.ts              # No changes needed
  App.tsx               # Remove global type declaration
  main.tsx              # No changes needed
  hooks/
    useExperimentIO.ts  # Fix state leakage
    useKeyboardShortcuts.ts  # No changes needed
  lib/
    parquet/            # NEW: Split from parseParquet.ts
      index.ts
      arrow.ts
      behaviour.ts
      keypoints.ts
      wasm.ts
    fileManager.ts      # No changes needed
    bouts.ts            # No changes needed
    colors.ts           # No changes needed
  components/           # No structural changes
    ...
```

---

## Code Smell: Hidden Dependencies

**File:** `useKeyboardShortcuts.ts`

The keyboard shortcuts hook subscribes to the entire store:

```typescript
const unsub = useStore.subscribe((s) => {
  isPlayingRef.current = s.isPlaying
  currentFrameRef.current = s.currentFrame
  // ... 6 more subscriptions
})
```

**Better approach:** The hook only needs to read state, not react to it. Consider using `useStore.getState()` inside the handler instead of maintaining refs.

However, this is **not a critical issue** - the current approach works and is performant.

---

## Final Verdict

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Global types in components | 1 | 0 | High |
| State leakage in hooks | 1 | 0 | High |
| Files > 200 lines | 2 | 0 | High |
| Magic numbers | 8 | 0 | Medium |
| Inline style objects | 40+ | <20 | Low |
| Hardcoded colors | 20+ | 0 | Low |

**Bottom Line:** This is already a lean, functional codebase. The high-priority fixes are small, surgical changes. Don't over-engineer - the current architecture is solid.

---

## Action Items

### Immediate (This Session)
- [ ] Move `Window.electron` declaration to `types.ts`
- [ ] Fix `useExperimentIO` to use refs for `rawTable`
- [ ] Remove unused `rafHandle` from `VideoPane`

### Next Session
- [ ] Split `parseParquet.ts` into `lib/parquet/` modules
- [ ] Create `constants.ts` for magic numbers

### When Convenient
- [ ] Add CSS variables for theming
- [ ] Convert inline styles (gradually, as you touch components)
