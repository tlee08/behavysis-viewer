# Streamline code and add 5_features graph

**Session ID:** ses_111903476ffeFjkKyTbTIZMY4J
**Created:** 6/22/2026, 6:26:04 PM
**Updated:** 6/22/2026, 6:30:04 PM

---

## User

You are a principle engineer and data scientist. You want to clean up this program, make it more easily maintainable, and more streamlined for developers and users. The example data you are working with is in @example_analysis . Give a detailed review of what why and how we can streamline and simplify this source code (with the view of adding further features like another graph below that plots out the columns in 5_features_extracted). Speak like caveman, and use context7, tavily, and karpathy principles (but be a bold, and brutally honest principle engineer in suggesting real improvements even if they take restructuring).

---

Now have full picture. Brutal review incoming.

---

## Caveman Code Review: behavysis-viewer

### What Works (Keep These)

- Single Zustand store. No prop-drilling hell. Good.
- IPC layer thin. 6 handlers, each one-liner. No logic in bridge. Correct.
- TypeScript everywhere. Types tight, `ActualValue` union exact.
- `requestVideoFrameCallback` pattern for frame-accurate sync. Solid.
- Parquet parsing in main process. Not blocking UI thread. Right call.
- Konva timeline with drag handles. Functional, performant.

---

### What Broken / Brittle (Fix These First)

**1. Path resolution silently wrong. `fileManager.ts:29`**

Code does `dirname(dirname(configPath))` assuming `0_configs/NAME.json`. But example_analysis has `0_config/NAME.json` (singular, no 's'). So `dirname(root)` strips `0_config/`, leaves parent directory. Then `join(root, "2_formatted_vid"...)` resolves relative to **wrong directory**. This **does not** match actual example data structure.

```typescript
// Current: assumes 0_configs/ → strips → joins to parent
// Actual example: 0_config/ → strips → joins one level too high
```

Fix: Stop assuming folder depth. Walk up from config path, find siblings by name pattern matching (`2_formatted_vid`, `4_preprocessed`, etc.) relative to config's parent. Or parse from config JSON directly — it knows all output paths.

**2. Save is destructive. `saveBehav.ts:103`**

`result.writeParquet(path)` overwrites in-place. If Electron crashes mid-write, data gone. No atomic write, no `.tmp` file, no backup.

Fix: Write to `.tmp`, validate, `fs.rename` atomic replace. Trivial to add, massive safety gain.

**3. README lies. Documents deleted code.**

`README.md` mentions `parseParquet.ts`, `bouts.ts`, `DataGraphPane.tsx`, `addGraphSeries()`, `graphSeries`. None exist. Confuses every new developer.

Fix: Either delete README graph section, or actually build it (see below).

**4. Bout ID unstable. `parseBehav.ts:180-182`**

`b.id = i` after every sort. So bout `#5` today might be different bout tomorrow if save/load changes sort order. Any external reference (notes, exports) breaks.

Fix: Use `start_frame + "_" + behav` as stable key. Keep numeric `id` for React keys, but never expose as identity.

**5. No lint, no test, no CI.**

`AGENTS.md` says "manually match surrounding style". For multi-contributor lab tool, this is technical debt bomb.

Fix: Add `eslint` + `prettier` (5 min config). Write 2 smoke tests: open example config, verify bouts.length > 0.

---

### What Over-Engineered / Unnecessary (Strip These)

**6. `useFps` hook is 5 lines wrapping `config?.fps ?? 15`. `useFps.ts:1-5`**

3 components import this for a single `?? 15` fallback. Just read from store directly. Remove the hook.

**7. `interimBoutEdit` three-way sync. `store.ts:52-59`, `BoutTimeline.tsx`, `BoutInspector.tsx`**

Drag handle → `setInterimBoutEdit` → React re-render → `BoutInspector` reads interim → syncs local `editStart`/`editStop` state. That's store → component A → component B with local state mirroring. Every sync point is potential drift.

Fix single approach: Either all editing lives in store (timeline reads/writes store, inspector reads store), OR all editing lives local in inspector (timeline calls inspector's setter via callback). Not both.

**8. `VideoPane` double-ref-indirection. `VideoPane.tsx:51-67`**

```typescript
const drawKeypointsRef = useRef(drawKeypoints);
drawKeypointsRef.current = drawKeypoints;
const scheduleRvcRef = useRef(scheduleRvc);
scheduleRvcRef.current = scheduleRvc;
```

Classic stale-closure workaround. Works but 2 refs wrapping 2 callbacks = 4 extra refs. Use single `useRef` holding all latest values, or use `useCallback` with store getters (Zustand supports `useStore.getState()` outside render).

**9. Manual `dirname`/`basename`/`join` in `fileManager.ts:3-21`**

Node.js has `path` module. You're in Electron main process. You already `import { join } from "path"` in `main/index.ts:2`. Just use it. The manual `sep(p)` function checking for `\\` is premature Windows defense when you already have `path.sep`.

---

### Feature Graph: What It Actually Takes

You want graph below timeline plotting columns from `5_features_extracted/VIDEO_002.parquet` (546 columns, 13,501 rows). Current code has **zero** infrastructure for this. README claims `addGraphSeries` / `DataGraphPane` exists but doesn't.

Here's what needed:

**A. Main process — new IPC handler**

```
parse-features → reads features parquet → returns { columns: string[], numFrames: number, data: Record<string, Float64Array> }
```

But 546 × 13,501 × 8 bytes = **59 MB**. Don't send whole thing over IPC. Options:

- Send column names first (metadata). User picks columns. Send only those.
- OR: lazy-load slices. Pass frame range, return only visible window.

Recommendation: **Column picker approach**. Parse returns column names only (tiny). User picks 1-4 columns from dropdown. Second IPC call fetches just those columns as `Float64Array`.

**B. New IPC handler: `parse-features`**

```typescript
// ipc.ts addition
ipcMain.handle("parse-features-columns", (_, path: string) => {
  const df = pl.readParquet(path);
  return df.columns; // just names
});
ipcMain.handle("parse-features-data", (_, path: string, columns: string[]) => {
  const df = pl.readParquet(path);
  const result: Record<string, Float64Array> = {};
  for (const col of columns) {
    result[col] = Float64Array.from(df.getColumn(col).toArray(), Number);
  }
  return result;
});
```

**C. Path resolution — add features path**

```typescript
// fileManager.ts addition
featuresPath: joinFn(root, "5_features_extracted", `${name}.parquet`);
```

**D. Store additions**

```typescript
featureColumns: string[];           // available column names
selectedFeatureColumns: string[];   // user-chosen columns to plot
featureData: Record<string, Float64Array>;  // per-column frame data
featureColors: Record<string, string>;       // assigned colors
```

**E. New UI components**

1. **FeatureGraphPane** — Konva or Canvas-based line chart, same time window as BoutTimeline. Multiple lines, one per selected column. Scrolls with playback cursor. Y-axis auto-scaled to visible window.

   Simpler than it sounds. BoutTimeline already has `frameToX`, `xToFrame`, `visibleRange`. Share those via hook or context. FeatureGraphPane just plots `Float64Array[frame]` for each selected column inside visible range.

2. **ColumnPicker** — Dropdown/multiselect in PlaybackSettingsPopover. Shows all 546 column names (or pre-filtered to top N interesting ones).

**F. Layout**

Add below BoutTimeline in App.tsx, stacked vertically. ResizablePanel already handles overflow. FeatureGraphPane gets same width, ~100px height.

---

### Simplification Roadmap (Priority Order)

**Phase 1 — Fix bugs, zero new features (1-2 hours)**

1. Fix path resolution — don't hardcode folder depth
2. Atomic save — write to `.tmp`, validate, rename
3. Update README — remove dead references, document actual architecture
4. Add ESLint + Prettier config

**Phase 2 — Slim down (1-2 hours)** 5. Remove `useFps` hook — inline `config?.fps ?? 15` 6. Remove manual path utils — use Node `path` module 7. Simplify `VideoPane` ref-indirection — single ref object

**Phase 3 — Feature graph (2-4 hours)** 8. Add features path to `resolveExperimentPaths` 9. Add `parse-features-columns` and `parse-features-data` IPC handlers 10. Add `featureColumns`, `selectedFeatureColumns`, `featureData`, `featureColors` to store 11. Build `FeatureGraphPane` component (Canvas line chart, same time window) 12. Add column picker dropdown to `PlaybackSettingsPopover` 13. Wire into `App.tsx` layout below BoutTimeline

**Phase 4 — Stability (1-2 hours)** 14. Stable bout identity — use `start_behav` key, keep numeric id internal 15. Simplify `interimBoutEdit` to single-path data flow 16. Write 2 smoke tests

---

### What NOT To Do

- **Don't add ECharts/uPlot/d3**. You already have Konva. Canvas line chart for 13K data points is ~30 lines. Adding chart library = 100KB+ bundle for feature you can implement in an afternoon.
- **Don't send all 546 columns to renderer**. Column picker approach is mandatory.
- **Don't add per-column color config**. Reuse `generateColors(n)` for auto-assigned distinct colors. User can override later if they care.
- **Don't refactor store to multiple slices yet**. Single store is fine for current size. Split when it hits 300+ lines or 15+ actions.
- **Don't preserve `interimBoutEdit` pattern**. Kill it. One source of truth for editing.

---

### Karpathy Check

| Principle             | Status                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------- |
| Think before coding   | Path resolution didn't match actual data. Skip.                                         |
| Simplicity first      | `useFps` hook, manual path utils, double-ref indirection — all complexity without value |
| Surgical changes      | Refactor path resolution touches 1 file. Good.                                          |
| Goal-driven execution | Feature graph = 4 phases with verifiable checkpoints. Clear.                            |

---

Want me to start on Phase 1 (bug fixes) or jump to Phase 3 (feature graph wiring)?

---
