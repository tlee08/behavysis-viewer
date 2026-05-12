# Combined Recommendations: Behavysis Viewer

> **Authoritative synthesis of three independent reviews (DeepSeek, GLM, Kimi)**
> cross-referenced forensically against the actual 24-file source tree.
>
> Analysis date: 2026-05-09. Guidelines: Karpathy (simplicity first, surgical changes, goal-driven execution).

---

## Executive Summary

Three LLM reviews were compared forensically against the actual source code. The GLM review has been regenerated and is now accurate. The alignment landscape:

| Reviewer              | Accuracy | Items                  | Critical catch                                 |
| --------------------- | -------- | ---------------------- | ---------------------------------------------- |
| **DeepSeek**          | High     | 11 items, all verified | `webSecurity: false`                           |
| **GLM (regenerated)** | High     | 14 items, all verified | `webSecurity: false` + `rawParquet` dead state |
| **Kimi**              | Mixed    | ~9 items, 2 dangerous  | None (missed `webSecurity`)                    |

**Key finding:** DeepSeek and GLM (regenerated) are in near-total agreement on 12 items. Kimi has three significant problems: (1) recommends splitting `parseParquet.ts` which both other reviews explicitly advise against; (2) recommends converting `ACTUAL_COLORS` to CSS variables which would break canvas rendering; (3) misses the critical `webSecurity: false` vulnerability entirely.

GLM's regenerated review additionally caught `rawParquet` as dead state — a genuine finding DeepSeek missed.

---

## CONSENSUS RECOMMENDATIONS (DeepSeek + GLM agree)

These 12 items are converged-on by at least two reviewers and verified against the actual code. Kimi covers a subset (marked where applicable).

### CRITICAL

#### 1. `webSecurity: false` disables all Chromium security

**File:** `src/main/index.ts:13` | **Caught by:** DeepSeek, GLM | **Missed by:** Kimi

```typescript
webSecurity: false,  // Allow local file access (for video src)
```

Kills same-origin policy, CORS, and CSP for the entire renderer. Any XSS vector gets full filesystem read access. Needed only for loading `file://` video.

**Fix (Option A — custom protocol, preferred for large videos):**

```typescript
// In main process, before createWindow:
import { protocol } from "electron";
protocol.registerFileProtocol("local-media", (request, callback) => {
  const filePath = request.url.replace("local-media://", "");
  callback({ path: decodeURIComponent(filePath) });
});
```

Then serve `local-media:///absolute/path/to/video.mp4`. Re-enable `webSecurity: true`.

**Fix (Option B — blob URL, simpler):**

```typescript
// In useExperimentIO.ts, after reading video file:
const videoBytes = await window.electron.readFile(expPaths.videoPath);
const blob = new Blob([videoBytes], { type: "video/mp4" });
const videoUrl = URL.createObjectURL(blob);
setVideoUrl(videoUrl);
```

Clean up with `URL.revokeObjectURL()` on unmount/close. No protocol registration needed.

**Recommendation: USE OPTION B**

---

### HIGH

#### 2. Dead state: `rawParquet` — set but never read

**File:** `src/renderer/src/hooks/useExperimentIO.ts:10,32` | **Caught by:** GLM | **Missed by:** DeepSeek, Kimi (partially)

```typescript
const [rawParquet, setRawParquet] = useState<Uint8Array | null>(null); // line 10
setRawParquet(behavBytes); // line 32 — set on load, never consumed anywhere
```

`rawParquet` is set when opening a file but never read — not in render output, not in callbacks, not in the return value. Causes an unnecessary re-render on load. **Just delete both lines.**

#### 3. Dead ref: `behavNamesRef` — written but never read

**File:** `src/renderer/src/hooks/useExperimentIO.ts:12,35` | **Caught by:** DeepSeek, GLM | **Missed by:** Kimi

```typescript
const behavNamesRef = useRef<string[]>([]); // line 12
behavNamesRef.current = [...new Set(parsedBouts.map((b) => b.behav))]; // line 35
```

Computed on line 35, never consumed anywhere. Leftover from pre-refactoring `App.tsx`. **Delete both lines.**

#### 4. Dead `rafHandle` — unfinished refactoring artifact

**File:** `src/renderer/src/components/VideoPane.tsx:26,102` | **Caught by:** DeepSeek, GLM, Kimi

```typescript
const rafHandle = useRef<number>(0); // line 26 — never assigned after init
cancelAnimationFrame(rafHandle.current); // line 102 — always cancels handle 0 (no-op)
```

Frame-sync was migrated to `requestVideoFrameCallback` (`rvcHandle`) but the old `requestAnimationFrame` scaffolding was left behind. `cancelAnimationFrame(0)` is a harmless no-op but is dead code. **Delete lines 26 and 102.**

#### 5. Move `Window.electron` global type declaration out of component

**File:** `src/renderer/src/App.tsx:14-18` | **Caught by:** DeepSeek, GLM, Kimi

```typescript
declare global {
  interface Window {
    electron: import("../../../preload").ElectronAPI;
  }
}
```

Global type declarations don't belong in component files. **Move to `src/renderer/src/types.ts`:**

```typescript
declare global {
  interface Window {
    electron: import("../../preload").ElectronAPI;
  }
}
```

Remove the `declare global` block from `App.tsx`. Note: the import path changes because `types.ts` is one level deeper than `App.tsx` relative to `preload/`.

#### 6. Unused `numFrames` destructuring causes unnecessary re-renders

**File:** `src/renderer/src/components/BoutTimeline.tsx:17` | **Caught by:** DeepSeek, GLM | **Missed by:** Kimi

```typescript
const {
  bouts,
  currentFrame,
  visibleRange,
  config,
  numFrames,
  selectBout,
  selectedBoutId,
} = useStore();
```

`numFrames` is destructured but never used in the component body. Zustand subscribes to all destructured properties. **Remove `numFrames` from the destructuring.**

#### 7. Stale dependency `currentFrame` in `handleClick`

**File:** `src/renderer/src/components/BoutTimeline.tsx:121` | **Caught by:** DeepSeek, GLM | **Missed by:** Kimi

```typescript
[bouts, currentFrame, visibleRange, selectBout]; // currentFrame never accessed in body
```

`currentFrame` is in the deps array of `useCallback` for `handleClick` but never accessed inside the callback. The click handler gets detached and reattached on every frame change (~15-60×/sec). **Remove `currentFrame` from the deps array.**

#### 8. Unused imports in `DataGraphPane.tsx`

**File:** `src/renderer/src/components/DataGraphPane.tsx:6` | **Caught by:** DeepSeek, GLM | **Missed by:** Kimi

```typescript
import React, { useRef, useEffect, useCallback } from "react";
```

With `"jsx": "react-jsx"` in `tsconfig.web.json`, JSX is auto-handled — `React` not needed. `useCallback` is never called in this file. **Change to:**

```typescript
import { useRef, useEffect } from "react";
```

---

### MEDIUM

#### 9. Make `contextIsolation: true` explicit

**File:** `src/main/index.ts:10` | **Caught by:** DeepSeek, GLM | **Missed by:** Kimi

`contextIsolation` defaults to `true` since Electron 12, but this is a security-critical setting. Making it explicit documents intent and protects against future Electron default changes. `sandbox: false` also needs a comment explaining why.

```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  sandbox: false,  // required: preload uses Node path, url modules
},
```

#### 10. Redundant `React` imports in 10 `.tsx` files

**Caught by:** DeepSeek, GLM | **Missed by:** Kimi

With `"jsx": "react-jsx"`, `import React` is unnecessary unless using `React.*` values:

| File                         | Current                               | Fix                                  |
| ---------------------------- | ------------------------------------- | ------------------------------------ |
| `App.tsx:1`                  | `import React, { useEffect }`         | `import { useEffect }`               |
| `MenuBar.tsx:1`              | `import React`                        | Delete entirely                      |
| `PlaybackBar.tsx:1`          | `import React`                        | Delete entirely                      |
| `BoutsPanel.tsx:1`           | `import React, { useRef, useEffect }` | `import { useRef, useEffect }`       |
| `BoutInspector.tsx:1`        | `import React`                        | Delete entirely                      |
| `VideoPane.tsx:1`            | `import React, { ..., useState }`     | Remove `React, `                     |
| `BoutTimeline.tsx:1`         | `import React, { ..., useCallback }`  | Remove `React, `                     |
| `DataGraphPaneECharts.tsx:7` | `import React, { useRef, useEffect }` | `import { useRef, useEffect }`       |
| `ErrorBoundary.tsx:1`        | `import React`                        | `import { Component } from 'react'`  |
| `main.tsx:1`                 | `import React`                        | `import { StrictMode } from 'react'` |

#### 11. Dead `@renderer/*` path alias

**File:** `tsconfig.web.json:12-14` | **Caught by:** DeepSeek, GLM | **Missed by:** Kimi

```json
"paths": { "@renderer/*": ["src/renderer/src/*"] }
```

Configured but zero imports use it — all imports are relative. **Remove the `paths` block** from `tsconfig.web.json`.

---

### LOW (defer or incremental)

#### 12. Verbose `: React.ReactElement` return type annotations

**Caught by:** DeepSeek | **Noted by:** GLM (listed in table only)

All 8 function components explicitly annotate returns as `: React.ReactElement`. TypeScript infers this from the returned JSX. Remove from function components for leanness (keep on class components like `ErrorBoundary.render()` where idiomatic).

**Affected:** VideoPane, BoutTimeline, DataGraphPane, DataGraphPaneECharts, BoutsPanel, BoutInspector, MenuBar, PlaybackBar, App.

#### 13. `rawTable` held in state — could be a ref (micro-optimization)

**File:** `src/renderer/src/hooks/useExperimentIO.ts:11,34,56,58,64` | **Caught by:** GLM, Kimi | **Missed by:** DeepSeek

`rawTable` is stored in state but is only consumed by `save()`, not by the render output. Moving it to a ref (`rawTableRef`) avoids an unnecessary re-render when the table loads. This is a micro-optimization — defer unless profiling shows an issue during large file loads.

**Important correction:** Kimi incorrectly claims `rawTable` is "never used." It IS used — in `save()` at lines 56, 58, and in the `useCallback` deps at line 64. It just doesn't need to be state.

#### 14. Inline styles everywhere

**Caught by:** DeepSeek, GLM, Kimi

40+ inline `style={{...}}` objects across components. Each creates new objects per render. Extract to CSS classes incrementally when touching components. Add CSS variables to `styles.css`:

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

#### 15. Duplicated magic numbers

**Caught by:** GLM, Kimi | **Missed by:** DeepSeek

`JUMP_FRAMES = (fps: number) => Math.round(5 * fps)` is defined identically in two places:

- `PlaybackBar.tsx:4`
- `useKeyboardShortcuts.ts:4`

Create `src/renderer/src/constants.ts`:

```typescript
export const JUMP_SECONDS = 5;
export const JUMP_FRAMES = (fps: number) => Math.round(JUMP_SECONDS * fps);
export const VIDEO_ASPECT_RATIO = "480/320";
export const TIMELINE_ROW_HEIGHT = 24;
export const TIMELINE_LABEL_WIDTH = 80;
```

Import `JUMP_FRAMES` from constants in both files, removing the duplication.

---

## CONTRADICTIONS RESOLVED

### 1. Split `parseParquet.ts`? Kimi: YES / DeepSeek + GLM: NO

**Resolution: Don't split.** Consensus between DeepSeek and GLM. Per Karpathy guideline #2 (Simplicity First): "No abstractions for single-use code." The file is 322 lines of single-domain logic (pandas MultiIndex via parquet). The existing block comments (`// ─── behaviour DF ───`) serve as section markers. Splitting into 4 files (`arrow.ts`, `behaviour.ts`, `keypoints.ts`, `wasm.ts`) adds 4 import chains and navigation friction with zero functional gain. A developer debugging "why is this keypoint NaN?" currently searches one file; after splitting, they'd search 3+.

### 2. Convert `ACTUAL_COLORS` to CSS variables? Kimi: YES / GLM: NO

**Resolution: Don't do this.** GLM correctly identifies this would break `BoutTimeline.tsx:66`:

```typescript
ctx.fillStyle = ACTUAL_COLORS[bout.actual]; // Canvas 2D context needs raw hex, not var()
```

Canvas `fillStyle` does not resolve CSS custom properties. `ACTUAL_COLORS` must remain hex literals. Add CSS variables separately in `styles.css` for component styling only.

### 3. Severity of `contextIsolation: true`: DeepSeek says LOW / GLM says MEDIUM

**Resolution: MEDIUM.** While the default is safe, this is a security-critical setting in an Electron app that already has `webSecurity: false`. Making it explicit is a defense-in-depth measure and documents intent. Treat as MEDIUM.

---

## KIMI-SPECIFIC PROBLEMS

Kimi's review has three significant issues:

| #   | Problem                                                                                           | Severity                |
| --- | ------------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | Recommends splitting `parseParquet.ts` — contradicts both other reviewers and Karpathy guidelines | **Wrong direction**     |
| 2   | Recommends converting `ACTUAL_COLORS` to CSS `var()` — would break canvas rendering               | **Would break code**    |
| 3   | Misses `webSecurity: false` — the single most critical issue in the codebase                      | **Critical miss**       |
| 4   | Claims `rawTable` is "never used" — actually consumed by `save()` at lines 56, 58                 | **Factually incorrect** |

Kimi's valid contributions (all covered by GLM and/or DeepSeek): move `Window.electron` type, remove `rafHandle`, magic numbers to constants, inline styles to CSS, `rawTable` to ref optimization.

---

## ADDITIONAL FORENSIC FINDINGS (not in any review)

### A1. `DataGraphPane.tsx` lacks resize handling (uPlot variant)

**File:** `src/renderer/src/components/DataGraphPane.tsx:26-65`

The uPlot instance is created once with `containerRef.current.clientWidth`. When the window resizes, the chart dimensions become stale. The ECharts variant (`DataGraphPaneECharts.tsx:65-66`) correctly uses a `ResizeObserver`. The uPlot variant should too.

**Fix:** Add a `ResizeObserver` that calls `plotRef.current.setSize({ width, height })`:

```typescript
useEffect(() => {
  const plot = plotRef.current;
  const container = containerRef.current;
  if (!plot || !container) return;
  const ro = new ResizeObserver(() => {
    plot.setSize({ width: container.clientWidth, height });
  });
  ro.observe(container);
  return () => ro.disconnect();
}, [height]);
```

### A2. `saveJson` path construction is fragile

**File:** `src/renderer/src/hooks/useExperimentIO.ts:69`

```typescript
await window.electron.writeJson(
  paths.behavsPath.replace(".parquet", "_bouts.json"),
  bouts,
);
```

If the filename contains `.parquet` somewhere other than the extension (e.g., `data.parquet.parquet`), or if it's absent altogether, the replacement produces an unexpected path. Low-severity edge case but worth hardening:

```typescript
paths.behavsPath.replace(/\.parquet$/, "_bouts.json");
```

---

## PRIORITY-ORDERED ACTION ITEMS

| #   | Item                                                   | Risk         | Effort  | Converged      |
| --- | ------------------------------------------------------ | ------------ | ------- | -------------- |
| 1   | Fix `webSecurity: false` (custom protocol or blob URL) | **Critical** | 15 min  | DeepSeek + GLM |
| 2   | Delete `rawParquet` dead state                         | None         | 1 min   | GLM            |
| 3   | Delete `behavNamesRef` dead ref                        | None         | 1 min   | DeepSeek + GLM |
| 4   | Delete `rafHandle` dead code                           | None         | 2 min   | All three      |
| 5   | Move `Window.electron` type to `types.ts`              | None         | 2 min   | All three      |
| 6   | Remove `numFrames` from BoutTimeline destructure       | None         | 1 min   | DeepSeek + GLM |
| 7   | Fix stale `currentFrame` dep in handleClick            | None         | 1 min   | DeepSeek + GLM |
| 8   | Remove unused imports in DataGraphPane                 | None         | 1 min   | DeepSeek + GLM |
| 9   | Make `contextIsolation: true` explicit                 | None         | 2 min   | DeepSeek + GLM |
| 10  | Remove redundant `React` imports (10 files)            | None         | 5 min   | DeepSeek + GLM |
| 11  | Remove dead `@renderer/*` path alias                   | None         | 2 min   | DeepSeek + GLM |
| 12  | Add ResizeObserver to DataGraphPane (uPlot)            | None         | 5 min   | New finding    |
| 13  | Remove verbose `: React.ReactElement` annotations      | None         | 5 min   | DeepSeek       |
| 14  | Extract magic numbers to constants file                | None         | 10 min  | GLM + Kimi     |
| 15  | Fix `saveJson` regex to `/\.parquet$/`                 | None         | 1 min   | New finding    |
| 16  | `rawTable` state → ref (micro-optimization)            | None         | 5 min   | GLM + Kimi     |
| 17  | Inline styles → CSS classes (incremental)              | Low          | Ongoing | All three      |

**Critical + High (items 1–8): ~24 minutes.**
**All items: ~56 minutes.**

---

## WHAT TO PRESERVE

These patterns are correct and should not be changed:

| Pattern                                             | Location                      | Why                                      |
| --------------------------------------------------- | ----------------------------- | ---------------------------------------- |
| IPC separation (main does I/O, renderer does logic) | `ipc.ts` + `preload/index.ts` | Correct Electron pattern                 |
| Zustand store with clear action names               | `store.ts`                    | Right size, no boilerplate               |
| `centerVisibleRange` as pure function               | `store.ts:55-58`              | Testable, avoids duplication             |
| Lazy WASM loading                                   | `parseParquet.ts:26-35`       | Avoids crashing renderer at startup      |
| ErrorBoundary wrapping                              | `main.tsx:9`                  | Graceful fallback                        |
| `useKeyboardShortcuts` with refs + subscribe        | `useKeyboardShortcuts.ts`     | No stale closures, registered once       |
| `@tanstack/react-virtual` in BoutsPanel             | `BoutsPanel.tsx:12`           | Efficient with thousands of bouts        |
| `requestVideoFrameCallback` for frame-sync          | `VideoPane.tsx:57-67`         | Frame-accurate (not sloppy `timeupdate`) |
| `parquet-wasm` excluded from Vite deps              | `electron.vite.config.ts:16`  | WASM must bypass optimization            |
| `ACTUAL_COLORS` as single source of truth           | `types.ts:53-57`              | Used by 3+ components + canvas           |

---

## WHAT NOT TO DO

Per Karpathy guidelines:

1. **Don't split `parseParquet.ts`** — single-domain file, well-commented. Splitting adds navigation friction with zero gain (DeepSeek + GLM consensus).

2. **Don't convert `ACTUAL_COLORS` to CSS `var()` references** — breaks canvas 2D rendering (GLM catch).

3. **Don't add React Router / Redux / Storybook** — wrong scale for this app.

4. **Don't add testing framework** — speculative complexity unless asked.

5. **Don't touch `ipc.ts` or `preload/index.ts`** — correct and minimal.

---

## SUCCESS CRITERIA

After fixes, verify:

1. `npm run typecheck` passes with no errors
2. `npm run dev` opens app without console errors
3. Video loads and plays correctly
4. Keyboard shortcuts work (Space, arrows, 1/2/3, k, f)
5. Save writes parquet file
6. Save bouts JSON writes to the correct path
7. Resize window → uPlot chart re-renders at correct dimensions
