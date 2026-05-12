# DeepSeek Recommendations: Behavysis Viewer

> Review conducted 2026-05-09 against Karpathy guidelines: simplicity first, surgical changes, goal-driven execution.

---

## Overview

The codebase is solid overall — clean architecture, well-structured Zustand store, thoughtful WASM lazy-loading, good use of canvas rendering. Most issues are dead code removal and minor tightening. One critical security issue stands out.

**Before:** 17 source files, ~1,800 lines. App.tsx at 266 lines.
**After prior refactoring:** 21 source files, ~1,700 lines. App.tsx at 75 lines.

---

## Critical

### 1. `webSecurity: false` disables all Chromium security (`src/main/index.ts:13`)

```typescript
webSecurity: false,
// Allow local file access (for video src)
```

This kills the same-origin policy, CORS, and CSP for the entire renderer process. Any XSS vector (e.g., a malicious filename rendered in the status bar) would have full local file system read access. The only thing needed is loading a `file://` video — a surgeon's scalpel, not a sledgehammer.

**Recommended fix:** Register a custom protocol to serve local files safely:

```typescript
// In main process, before window creation:
protocol.registerFileProtocol('local-media', (request, callback) => {
  const filePath = request.url.replace('local-media://', '')
  callback({ path: decodeURIComponent(filePath) })
})
```

Then serve `local-media:///absolute/path/to/video.mp4` instead of `file://`. This lets you re-enable `webSecurity: true`.

Alternatively, if the video path is always known ahead of time, read the video as a Blob in the renderer and use `URL.createObjectURL()` — no protocol work needed.

---

## Medium

### 2. Dead `rafHandle` — unfinished refactoring artifact (`src/renderer/src/components/VideoPane.tsx:26,102`)

```typescript
const rafHandle = useRef<number>(0)       // line 26 — created, never assigned
cancelAnimationFrame(rafHandle.current)   // line 102 — always cancels 0
```

The frame-sync was migrated from `requestAnimationFrame` to `requestVideoFrameCallback`, but the old rAF scaffolding was left behind. Calling `cancelAnimationFrame(0)` is harmless but dead code. Remove both lines.

### 3. Dead `behavNamesRef` — written but never read (`src/renderer/src/hooks/useExperimentIO.ts:12,35`)

```typescript
const behavNamesRef = useRef<string[]>([])     // line 12
behavNamesRef.current = [...new Set(...)]       // line 35 — computed, never consumed
```

The ref was carried over from the old `App.tsx` where it was used. Neither `save`, `saveJson`, nor any other code reads it. Remove it.

### 4. Unused `numFrames` in destructuring (`src/renderer/src/components/BoutTimeline.tsx:17`)

```typescript
const { bouts, currentFrame, visibleRange, config, numFrames, selectBout, selectedBoutId } = useStore()
```

`numFrames` is never used in the component. This triggers unnecessary re-renders when `numFrames` changes. Remove it from the destructuring.

### 5. Stale dependency `currentFrame` in `handleClick` (`src/renderer/src/components/BoutTimeline.tsx:121`)

```typescript
const handleClick = useCallback(
  (e) => { /* ... currentFrame is never read here ... */ },
  [bouts, currentFrame, visibleRange, selectBout],  // currentFrame is stale dep
)
```

`currentFrame` is listed as a dependency but never accessed inside the callback body. This means the `onClick` handler is detached and reattached on every frame change. Remove `currentFrame` from the array.

### 6. Unused imports (`src/renderer/src/components/DataGraphPane.tsx:6`)

```typescript
import React, { useRef, useEffect, useCallback } from 'react'
```

With `"jsx": "react-jsx"`, `React` is not needed. `useCallback` is not used anywhere in this file. Remove both.

### 7. Redundant `React` imports in 8 `.tsx` files

With `"jsx": "react-jsx"` configured in `tsconfig.web.json`, the automatic JSX runtime handles `React.createElement` — importing `React` at the top of `.tsx` files is unnecessary noise. Affected files:

- `src/renderer/src/main.tsx:1`
- `src/renderer/src/App.tsx:1`
- `src/renderer/src/components/MenuBar.tsx:1`
- `src/renderer/src/components/ErrorBoundary.tsx:1`
- `src/renderer/src/components/PlaybackBar.tsx:1`
- `src/renderer/src/components/BoutsPanel.tsx:1`
- `src/renderer/src/components/BoutInspector.tsx:1`
- `src/renderer/src/components/DataGraphPane.tsx:6`

Each file can replace `import React, ...` with just the needed hooks/deps import. `ErrorBoundary.tsx` is the exception — it extends `React.Component`, so it needs `import { Component } from 'react'` instead.

### 8. Dead `@renderer/*` path alias (`tsconfig.web.json:12-14`)

```json
"paths": {
  "@renderer/*": ["src/renderer/src/*"]
}
```

Configured but never used — all imports use relative paths. Either adopt the alias consistently across the codebase or remove it to avoid confusion.

---

## Low

### 9. Verbose `React.ReactElement` return type annotations

All 8 components explicitly annotate returns as `: React.ReactElement`. TypeScript infers this from the JSX returned. They can be removed for leanness without any loss of type safety. (Keep them on class components like `ErrorBoundary.render()` where it's idiomatic.)

### 10. `contextIsolation: true` should be explicit (`src/main/index.ts:10`)

```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: false,
```

`contextIsolation` defaults to `true` since Electron 12, but relying on defaults is fragile. Add `contextIsolation: true` explicitly and a comment on why `sandbox: false` is needed.

### 11. Pervasive inline styles

Every component uses `style={{...}}`. This creates new objects per render and prevents media-query-based responsive styling. The `styles.css` file already exists and is used for `.menu-btn` and `.ctrl-btn`. Consider moving frequently repeated style patterns (dark background colors, monospace fonts, border colors) to CSS classes.

---

## Praise — Keep These Patterns

| Pattern | Why it's good |
|---------|---------------|
| **IPC separation** (`src/main/ipc.ts`) — main process does zero parsing, only file I/O | Correct Electron pattern — renderer owns all logic |
| **Zustand store** (`src/renderer/src/store.ts`) — single source of truth, clear action names | Simple, performant, no boilerplate |
| **`centerVisibleRange` extracted as pure function** — not inside the zustand `create` closure | Testable, avoids duplication between `setCurrentFrame` and `panToFrame` |
| **Lazy WASM loading** (`parseParquet.ts:26-35`) | Avoids crashing the renderer at startup |
| **ErrorBoundary wrapping the entire app** (`main.tsx:8`) | Graceful fallback if any component throws |
| **`useKeyboardShortcuts` with refs + subscribe** | No stale closures, handler registered once (not per frame) |
| **`@tanstack/react-virtual`** in BoutsPanel | Efficient with thousands of bouts; correct overscan=10 |
| **`requestVideoFrameCallback`** for frame-sync | Frame-accurate where `timeupdate` would be sloppy |
| **`parquet-wasm` excluded from Vite optimization** (`electron.vite.config.ts`) | WASM modules must bypass Vite's dep optimization |
| **`ACTUAL_COLORS`** in `types.ts` | Single source of truth for color mapping used across 3+ components |
| **`README.md`** — clear setup, usage, hotkey table, format docs, extensibility guide | Gold standard for a small project |

---

## What NOT to change

- **Don't add React Router** — single-page app, no navigation needed
- **Don't add Redux/MobX** — Zustand is the right size for this app
- **Don't refactor `parseParquet.ts`** — 305 lines handling a complex domain (pandas MultiIndex), well-commented, functional
- **Don't touch the IPC/preload setup** — correct and minimal
- **Don't add testing framework unless user asks** — speculative complexity
- **Don't add Storybook** — 5 tightly-coupled components

---

## Implementation Plan

If you want to implement these, the recommended order:

| Step | Item | Risk | Est. effort |
|------|------|------|-------------|
| 1 | Fix `webSecurity: false` (custom protocol or blob URL) | High | 15 min |
| 2 | Remove dead `rafHandle` lines in VideoPane | None | 2 min |
| 3 | Remove dead `behavNamesRef` in useExperimentIO | None | 2 min |
| 4 | Remove unused `numFrames` destructure in BoutTimeline | None | 2 min |
| 5 | Fix stale `currentFrame` dep in handleClick | None | 2 min |
| 6 | Remove unused imports in DataGraphPane | None | 1 min |
| 7 | Remove redundant `React` imports (8 files) | Low | 5 min |
| 8 | Make `contextIsolation: true` explicit + comment `sandbox: false` | None | 2 min |
| 9 | Remove dead `@renderer/*` alias or adopt consistently | None | 5 min |
| 10 | Remove verbose `: React.ReactElement` return types | None | 5 min |
