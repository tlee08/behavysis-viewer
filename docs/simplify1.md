# Overcomplicated animal behavior experiment viewer?

**Session ID:** ses_0f1a428c0ffeozi9Xr1hP2u4Ml
**Created:** 6/28/2026, 11:12:07 PM
**Updated:** 6/28/2026, 11:15:39 PM

---

## User

Review this repo? Is it overcomplicated what what it is trying to do?
It's just trying to be an experiment viewing program to score and view animal behaviour.
Is overcomplicated? Are there better alternative frameworks?
Be a principle software engineer and be honest. Your honesty now will save us a lot of headache in the future when maintaining and improving this program.
Use karpathy guidelines, contex7, and tavily to inform your review as well.

---

## Honest Review: Behavysis Viewer

### Bottom line up front

**It's not overcomplicated.** For a tool that does frame-accurate video playback with keypoint overlay, editable Gantt charts, parquet I/O, and full keyboard-driven scoring — ~3,130 lines across 32 files is lean, not bloated. Each complexity has a real justification.

### The Karpathy test

_"Would a senior engineer say this is overcomplicated?"_ — **No.** Every architectural choice serves a concrete requirement.

### What's justified

| Complexity                                                        | Why it's there                                                                                                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WebCodecs + custom `FrameReader`** (267 lines)                  | `<video>` element `currentTime` is **not frame-accurate**. For behavior scoring where you judge sub-second bouts, frame-level precision matters.           |
| **Konva canvas for Gantt chart** (301 lines)                      | Drag handles for bout range editing require pixel-level hit detection and interaction. A CSS timeline with drag handles would be _more_ complex, not less. |
| **`requestAnimationFrame` playback loop** (55 lines in VideoPane) | Variable-speed playback (0.1x–10x) with frame-level precision. No `<video>` playbackRate hack can do this.                                                 |
| **Electron main process for parquet**                             | `nodejs-polars` is a native Node binding that can't run in the renderer. Needed for complex multi-level parquet column names from the DLC pipeline.        |
| **Zustand over Redux**                                            | Already the minimalist choice. Good.                                                                                                                       |

### What's actually causing friction

**1. `nodejs-polars` native dependency** (the weakest link)

The app uses `nodejs-polars` to read 6-7 parquet columns and do run-length encoding. This is a ~50MB native binding that requires `electron-rebuild` and `postinstall` hooks for a task that could be done with a **WASM-based parquet reader** like [`duckdb-wasm`](https://github.com/duckdb/duckdb-wasm) directly in the renderer. Eliminating this one dependency would let you:

- Remove the main-process parquet libs (`parseBehav.ts`, `parseKeypoints.ts`, `parseFeatures.ts`, `saveBehav.ts` — ~400 lines)
- Remove 4 of 8 IPC handlers
- Eliminate `postinstall` rebuild step
- All data processing stays in one process

This is the **single highest-ROI simplification** available.

**2. Manual path utilities in the renderer** (`fileManager.ts:13-36`)

Because Node's `path` module isn't available in the renderer, you reimplement `sep()`, `dirnameFn()`, `basenameFn()`, `joinFn()`, `stripExt()`. This is a direct consequence of Electron's process split. Using `duckdb-wasm` wouldn't fix this (you still need Electron for filesystem access), but it's a code smell worth noting.

**3. Konva `FeatureGraph` (244 lines) for line charts**

Unlike the Gantt chart, the feature graph has no custom interaction — it's plain line series with a time axis. A library like [`lightweight-charts`](https://github.com/tradingview/lightweight-charts) (TradingView, 892 snippets, High reputation) would give you:

- Same ~100 lines of code instead of 244
- Built-in pan/zoom/crosshair
- Better performance with large datasets

This is a lower-priority simplification since the FeatureGraph is already written and working.

### Architecture grade card

| Dimension                   | Grade  | Notes                                                                                        |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Framework choice (Electron) | **B+** | Right tool for local file access. Tauri would be smaller but requires Rust.                  |
| State management (Zustand)  | **A**  | Minimal, no boilerplate, one store. Correct choice.                                          |
| UI library (Mantine)        | **A**  | Good component coverage for forms/inputs/tabs. Dark theme built in.                          |
| Charting (Konva)            | **B**  | Great for the Gantt chart (drag handles). Overkill for the line graph.                       |
| Parquet I/O (nodejs-polars) | **C+** | Works, but heavy. A WASM alternative in renderer would be simpler.                           |
| Video decoding (WebCodecs)  | **A**  | Correct tool for frame-accurate seeking. Well-implemented cache with keyframe-based seeking. |
| Code organization           | **A**  | Clear file structure, single-responsibility components, no over-abstraction.                 |
| Test coverage               | **F**  | No tests. This is your biggest risk for long-term maintenance.                               |

### What I'd do if starting fresh today

**Same scope, simpler stack:**

```
Tauri (native shell) + React + Mantine + Zustand
  ├── duckdb-wasm for parquet (in renderer, no IPC needed)
  ├── WebCodecs for video (keep the FrameReader class as-is)
  ├── Konva for Gantt chart only (keep BoutTimeline)
  └── lightweight-charts for feature graph (replace FeatureGraph)
```

This would: eliminate 8 IPC handlers, eliminate main-process lib directory, eliminate native build step, reduce bundle from ~150MB to ~10MB, keep the same features.

**But**: this is a rewrite. For an app that's 3,130 lines and already working, the rewrite cost exceeds the maintenance savings for probably 2+ years.

### Practical recommendations (no rewrite)

1. **Add tests.** Even 5 smoke tests on the store and keyboard shortcuts would massively improve confidence for future changes.

2. **Optionally swap `nodejs-polars` → `duckdb-wasm`** if you ever need to touch the parquet parsing code anyway. This is the highest-leverage simplification.

3. **Don't touch anything else.** The code is clean, the architecture is sound, and the feature set matches the requirements. More refactoring would introduce bugs for marginal benefit.

4. **Add a linter** (`eslint`). The project has no lint config, which means style drift will accumulate over time.

---

**Honest verdict**: This is better-architected than most academic lab software I've seen. The only architectural wart is `nodejs-polars` as a native dependency for a task that could run in WASM. Everything else is justified by the requirements. Ship it, add tests, don't overthink it.

---
