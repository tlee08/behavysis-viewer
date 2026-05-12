# GLM Review: Behavysis Viewer

> Karpathy-guideline analysis of Node/Electron app. Focus: lean, simple, modular, best-practices.

---

## Executive Summary

Codebase is **1,322 LOC** across 21 TypeScript files. Generally well-structured with good patterns:
- Clean IPC separation (main does I/O, renderer does logic)
- Zustand store is appropriately sized
- Lazy WASM loading avoids renderer crash
- Virtual scrolling for large bout lists
- `requestVideoFrameCallback` for frame-accurate sync

**Primary issues**: security vulnerability, dead code from incomplete refactoring, unnecessary re-renders.

---

## CRITICAL

### 1. `webSecurity: false` disables all Chromium security

**File**: `src/main/index.ts:13`

```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: false,
  webSecurity: false,  // <-- DANGEROUS
},
```

This kills same-origin policy, CORS, and CSP for the entire renderer. Any XSS vector (malicious bout name in UI) gains full filesystem read access.

**Fix options** (pick one):

**Option A**: Custom protocol (preferred for large videos)
```typescript
import { protocol } from 'electron'
import { pathToFileURL } from 'url'

// Before createWindow:
protocol.registerFileProtocol('local', (request, callback) => {
  const url = request.url.slice(8) // strip 'local://'
  callback({ path: decodeURIComponent(url) })
})
```
Use `local:///path/to/video.mp4` as video src. Re-enable `webSecurity: true`.

**Option B**: Blob URL (simpler, no protocol registration)
```typescript
// In useExperimentIO.ts, after reading file:
const videoBytes = await window.electron.readFile(expPaths.videoPath)
const blob = new Blob([videoBytes], { type: 'video/mp4' })
const videoUrl = URL.createObjectURL(blob)
setVideoUrl(videoUrl)
```
Clean up with `URL.revokeObjectURL()` on unmount/close.

---

## HIGH

### 2. Dead state: `rawParquet`

**File**: `src/renderer/src/hooks/useExperimentIO.ts:10,32`

```typescript
const [rawParquet, setRawParquet] = useState<Uint8Array | null>(null)  // line 10
setRawParquet(behavBytes)  // line 32 - set but never read
```

Causes unnecessary re-render on load. Delete both lines.

### 3. Dead ref: `behavNamesRef`

**File**: `src/renderer/src/hooks/useExperimentIO.ts:12,35`

```typescript
const behavNamesRef = useRef<string[]>([])  // line 12
behavNamesRef.current = [...new Set(parsedBouts.map((b) => b.behav))]  // line 35
```

Never read anywhere. Leftover from pre-refactoring App.tsx. Delete both lines.

### 4. Dead `rafHandle` in VideoPane

**File**: `src/renderer/src/components/VideoPane.tsx:26,102`

```typescript
const rafHandle = useRef<number>(0)  // line 26 - never assigned after init
cancelAnimationFrame(rafHandle.current)  // line 102 - always cancels handle 0 (no-op)
```

Frame sync migrated to `requestVideoFrameCallback` but old rAF scaffolding left behind. Delete lines 26 and 102.

### 5. Move `Window.electron` type to types.ts

**File**: `src/renderer/src/App.tsx:14-18`

```typescript
declare global {
  interface Window {
    electron: import('../../../preload').ElectronAPI
  }
}
```

Global type declarations don't belong in component files. Move to `types.ts`.

### 6. Unused `numFrames` destructuring

**File**: `src/renderer/src/components/BoutTimeline.tsx:17`

```typescript
const { bouts, currentFrame, visibleRange, config, numFrames, selectBout, selectedBoutId } = useStore()
```

`numFrames` is destructured but never used. Zustand subscribes to all destructured properties, causing re-renders. Remove `numFrames` from destructuring.

### 7. Stale `currentFrame` dependency

**File**: `src/renderer/src/components/BoutTimeline.tsx:121`

```typescript
[bouts, currentFrame, visibleRange, selectBout]
```

`currentFrame` in deps but never accessed in `handleClick`. Callback re-created every frame (~15-60x/sec). Remove `currentFrame` from deps.

### 8. Unused imports

**File**: `src/renderer/src/components/DataGraphPane.tsx:6`

```typescript
import React, { useRef, useEffect, useCallback } from 'react'
```

With `"jsx": "react-jsx"`, `React` not needed. `useCallback` never called. Change to:
```typescript
import { useRef, useEffect } from 'react'
```

---

## MEDIUM

### 9. Make `contextIsolation` explicit

**File**: `src/main/index.ts:10`

`contextIsolation` defaults to `true` since Electron 12, but security-critical settings should be explicit:

```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  sandbox: false,  // required: preload uses Node modules
},
```

### 10. Redundant `React` imports (8 files)

With `"jsx": "react-jsx"`, `import React` is unnecessary unless using `React.*`:

| File | Action |
|------|--------|
| `App.tsx` | Remove `React, ` |
| `MenuBar.tsx` | Delete import |
| `PlaybackBar.tsx` | Delete import |
| `BoutsPanel.tsx` | Remove `React, ` |
| `BoutInspector.tsx` | Delete import |
| `VideoPane.tsx` | Remove `React, ` |
| `BoutTimeline.tsx` | Remove `React, ` |
| `DataGraphPaneECharts.tsx` | Remove `React, ` |
| `ErrorBoundary.tsx` | Change to `import { Component } from 'react'` |
| `main.tsx` | Change to `import { StrictMode } from 'react'` |

### 11. Dead `@renderer/*` path alias

**File**: `tsconfig.web.json:12-14`

Configured but never used. All imports are relative. Remove the `paths` block.

---

## LOW (defer or incremental)

### 12. `rawTable` could be a ref

**File**: `src/renderer/src/hooks/useExperimentIO.ts:11,34`

`rawTable` is state but doesn't need to trigger re-render (only consumed in `save()`). Micro-optimization. Defer unless profiling shows issue.

### 13. Inline styles everywhere

40+ inline `style={{...}}` objects. Each creates new object per render. 

**Defer**: Extract to CSS classes incrementally when touching components. Define CSS variables:
```css
:root {
  --bg-primary: #0f172a;
  --bg-panel: #1e293b;
  --bg-input: #334155;
  --text-primary: #e2e8f0;
  --text-muted: #64748b;
  --text-dim: #94a3b8;
  --border: #334155;
}
```

### 14. Duplicated magic numbers

`JUMP_FRAMES` defined identically in:
- `PlaybackBar.tsx:4`
- `useKeyboardShortcuts.ts:4`

Create `src/renderer/src/constants.ts`:
```typescript
export const JUMP_SECONDS = 5
export const VIDEO_ASPECT_RATIO = '480/320'
export const TIMELINE_ROW_HEIGHT = 24
export const TIMELINE_LABEL_WIDTH = 80
```

---

## WHAT NOT TO DO

Per Karpathy guidelines:

1. **Don't split `parseParquet.ts`** — 322 lines of single-domain logic. Block comments serve as section markers. Splitting adds 4+ files and navigation friction with zero gain.

2. **Don't add testing framework** — speculative complexity unless asked.

3. **Don't add Redux/Router/Storybook** — wrong scale for this app.

4. **Don't convert `ACTUAL_COLORS` to CSS variables** — breaks canvas rendering (`ctx.fillStyle` needs hex).

5. **Don't touch IPC or preload** — correct and minimal.

---

## PRESERVE

These patterns are correct:

| Pattern | Location |
|---------|----------|
| IPC separation | `ipc.ts` + `preload/index.ts` |
| Zustand store with pure helper | `store.ts:55-58` |
| Lazy WASM loading | `parseParquet.ts:26-35` |
| ErrorBoundary wrap | `main.tsx:9` |
| Keyboard hook with refs + subscribe | `useKeyboardShortcuts.ts` |
| Virtual scrolling | `BoutsPanel.tsx:12` |
| Frame-accurate video sync | `VideoPane.tsx:57-67` |
| WASM excluded from Vite deps | `electron.vite.config.ts:16` |

---

## PRIORITY ORDER

| # | Item | Effort |
|---|------|--------|
| 1 | Fix `webSecurity: false` | 15 min |
| 2 | Delete `rawParquet` state | 1 min |
| 3 | Delete `behavNamesRef` | 1 min |
| 4 | Delete `rafHandle` | 2 min |
| 5 | Move Window.electron type | 2 min |
| 6 | Remove `numFrames` destructure | 1 min |
| 7 | Fix stale `currentFrame` dep | 1 min |
| 8 | Remove unused imports | 1 min |
| 9 | Make contextIsolation explicit | 2 min |
| 10 | Remove React imports | 5 min |
| 11 | Remove @renderer path alias | 2 min |
| 12 | Extract constants | 10 min |

**Critical + High (1-8): ~25 min**
**All items: ~45 min**

---

## SUCCESS CRITERIA

After fixes:
1. `npm run typecheck` passes
2. `npm run dev` opens app without console errors
3. Video loads and plays
4. Keyboard shortcuts work (Space, arrows, 1/2/3)
5. Save writes parquet file
