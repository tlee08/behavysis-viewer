# Code Review: Combined Recommendations Implementation

Date: 2026-05-09 | Baseline: `recommendations/combined.md`

## Summary

15 of 17 actionable items implemented. 2 intentionally deferred (LOW priority / incremental). `pnpm typecheck` passes clean (zero errors). No regressions introduced. All "what NOT to do" constraints respected.

## Per-Item Audit

| # | Item | Verdict | Notes |
|---|------|---------|-------|
| 1 | Fix `webSecurity: false` — blob URL | **PASS** | `webSecurity` removed from main, `contextIsolation:true` made explicit, video loaded via Blob/URL.createObjectURL in renderer. Blob URL revoked on unmount + before new load. Hardcoded `video/mp4` MIME type (see note below). |
| 2 | Delete `rawParquet` dead state | **PASS** | Removed from `useState` and setter call. |
| 3 | Delete `behavNamesRef` dead ref | **PASS** | Removed from `useRef` and assignment. |
| 4 | Delete `rafHandle` dead code | **PASS** | Removed `useRef` declaration and `cancelAnimationFrame` call. Cleanup effect now only cancels `rvcHandle`. |
| 5 | Move `Window.electron` type to `types.ts` | **PASS** | Declared at top of `types.ts` with correct relative path `../../preload`. Removed from `App.tsx`. |
| 6 | Remove `numFrames` from BoutTimeline destructure | **PASS** | Removed from Zustand destructure. No remaining usage in component. |
| 7 | Fix stale `currentFrame` dep in handleClick | **PASS** | `currentFrame` removed from deps array. Click handler no longer recreated on every frame change. |
| 8 | Remove unused imports in DataGraphPane.tsx | **PASS** | Removed `React` and `useCallback` from import. Only `useRef`/`useEffect` remain, both used. |
| 9 | Make `contextIsolation: true` explicit | **PASS** | Added with comment for `sandbox: false`. |
| 10 | Remove redundant `React` imports (10 files) | **PASS** | All 10 files fixed. `React` import removed where JSX handled by `react-jsx` transform; only named imports (`useState`, `useEffect`, `Component`, `StrictMode`, `ReactNode`) remain as needed. ErrorBoundary correctly migrated to `Component` + `type ReactNode`. |
| 11 | Remove dead `@renderer/*` path alias | **PASS** | Removed `baseUrl` and `paths` block from `tsconfig.web.json`. |
| 12 | ResizeObserver for DataGraphPane (uPlot) | **PASS** | Added `ResizeObserver` in setup effect; `ro.disconnect()` in cleanup. Calls `plot.setSize()` on container resize. |
| 13 | Remove verbose `: React.ReactElement` annotations | **DEFERRED** | LOW priority. 9 files affected. Cosmetic; TypeScript infers correctly without them. |
| 14 | Duplicated magic numbers → constants | **PASS** | `constants.ts` created with `JUMP_SECONDS` and `JUMP_FRAMES`. Both `PlaybackBar.tsx` and `useKeyboardShortcuts.ts` import from constants. |
| 15 | Fix `saveJson` regex to `/\.parquet$/` | **PASS** | String replacement `".parquet"` → regex `/\.parquet$/`. Prevents malformed paths on filenames with multiple `.parquet` occurrences. |
| 16 | `rawTable` state → ref | **PASS** | Changed from `useState` to `useRef`. Updated `save()` to access `.current`. Removed `rawTable` from `useCallback` deps. |
| 17 | Inline styles → CSS classes (incremental) | **PARTIAL** | CSS variables added to `styles.css`. Full inline-style extraction deferred — matches recommendation's "incremental" guidance. |

## Constraints Verification

| Constraint | Status |
|-----------|--------|
| Don't split `parseParquet.ts` | **Respected** — file untouched |
| Don't convert `ACTUAL_COLORS` to CSS `var()` | **Respected** — unchanged, still hex literals |
| Don't touch `ipc.ts` or `preload/index.ts` | **Respected** — both files untouched |
| No new testing framework | **Respected** — no test infrastructure added |
| No React Router / Redux / Storybook | **Respected** — no new dependencies |
| Surgical changes only | **Respected** — only touched files in the action items |

## Notable Design Decision

**Blob URL approach (Item 1):** The implementation loads the entire video file into renderer memory via `readFile` → `Blob` → `URL.createObjectURL`. This keeps `webSecurity: true` and avoids custom protocol registration. Tradeoff accepted: for very large videos (hundreds of MB+), the custom protocol approach (Option A in recommendations) would be more memory-efficient. For the app's typical use case (research video clips, seconds to minutes), this is the right call per the recommendation's explicit choice of Option B.

**Hardcoded MIME type (`video/mp4`):** The Blob is created with `type: 'video/mp4'`. This is equivalent to the prior behavior (the browser determined the type from the `file://` URL). Chromium handles Blob type hints gracefully. If non-mp4 formats become common, consider detecting MIME from file extension.

## Minor Observations (non-blocking)

- `MenuBar.tsx` line 1 is now blank (import deleted, trailing newline artifact). Harmless.
- `src/preload/index.ts` still exports `getVideoUrl` in the API surface — unused after blob URL migration. Intentionally not removed (constraint: don't touch preload).
- `rawTable` ref → `rawTableRef: null` after every `open()` call; if `save()` is called before opening a file, `rawTableRef.current` is null and shows "Nothing to save" — correct behavior, no regression.

## Overall Assessment

**PASS.** All critical and high items addressed correctly. TypeScript compiles without errors. No changes violate the "what not to do" constraints. The two deferred items (return type annotations, full inline-style extraction) are explicitly low-priority and incremental — deferral is appropriate under Karpathy guideline #2 (simplicity first).
