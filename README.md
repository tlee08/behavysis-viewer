# Behavysis Viewer (TypeScript/Electron)

Desktop app for reviewing binary classifier output from the [Behavysis](https://github.com/tlee08/behavysis) pipeline.

## Setup

```bash
pnpm install
pnpm run dev       # development with hot reload
pnpm run build     # production build
pnpm run typecheck # verify type correctness
pnpm run package   # build + package into binary
```

## Usage

1. **Open** — File > Open, select a `0_config/{name}.json` config file.
   All other paths (video, parquet) are resolved automatically from the same directory tree.
2. **Review bouts** — click a bout in the list, or click a bar in the timeline.
3. **Score** — Use the IS / NOT / UNSURE radio buttons, or hotkeys `1` / `2` / `3`.
4. **Edit range** — Drag the handles on the timeline bar, or type frame/timecode in the inspector.
5. **Save** — Writes scored parquet atomically (tmp file → verify → rename) to `7_scored_behavs/{name}.parquet`.

### Hotkeys

| Key             | Action                                |
| --------------- | ------------------------------------- |
| `Space`         | Play / pause                          |
| `←` / `→`       | Jump ± configurable seconds           |
| `K`             | Toggle keypoint overlay               |
| `F`             | Toggle focus mode (pause at bout end) |
| `R`             | Replay selected bout                  |
| `↑` / `↓`       | Navigate between bouts                |
| `1` / `2` / `3` | Score bout as IS / NOT / UNSURE       |

## Architecture

```
Electron Main Process (Node.js)
  ├── Window creation, app lifecycle
  ├── IPC handlers: file dialog, file read, parquet parse, parquet save
  └── src/main/lib/
        parseBehav.ts     — parquet → Bout[] (run-length encoding, migration)
        parseKeypoints.ts — parquet → KeypointDef[] + KeypointFrame[]
        saveBehav.ts      — Bout[] → parquet (atomic tmp→rename)
        columnNames.ts    — parse 2-level/4-level Python tuple column names
        colors.ts         — HSL-based color generation for keypoint individuals
        parquetUtils.ts   — row-0 frame offset, number coercion

Preload Bridge
  └── contextBridge: window.electron API (6 methods)

Renderer (Chromium + React 18 + Mantine 7)
  ├── Zustand store (single source of truth)
  ├── VideoPane: HTML5 video + canvas keypoint overlay (requestVideoFrameCallback)
  ├── BoutTimeline: Konva Gantt chart with drag handles
  ├── BoutsPanel: virtualized bout list (@tanstack/react-virtual)
  ├── BoutInspector: scoring radios, sub-behaviour checkboxes, range editor
  ├── PlaybackBar: controls + slider + settings popover
  ├── MenuBar: File > Open / Save + status bar
  └── hooks/
        useExperimentIO.ts      — load experiment orchestration
        useKeyboardShortcuts.ts — global hotkey handler
        useVisibleRange.ts      — visible frame window around current frame
```

## Data format

### Config JSON (`0_config/{name}.json`)

Pipeline config with `auto.formatted_vid.*` (fps, dimensions, frame count) and `user.evaluate_vid.*` (pcutoff, radius).

### Behaviour parquet (`6_predicted_behavs/` or `7_scored_behavs/`)

Uses 2-level column names:

- New format (written by viewer): `behav__actual`, `behav__subbehav`
- Old format (from pipeline): `('behav', 'actual')`, `('behav', 'pred')`

Actual values: `1`=TRUE_POS, `-1`=FALSE_POS, `0`=TRUE_NEG, `-2`=UNSURE

### Keypoints parquet (`4_preprocessed/`)

DLC 4-level tuple column names: `('DLC_scorer', 'mouse1', 'Nose', 'x')`

### Features parquet (`5_features_extracted/`)

Flat per-frame feature columns (centroid distance, movement, angles, etc). Not yet displayed — coming in a future update.

## Project structure

```
src/
  shared/
    types.ts              Shared types (Bout, ActualValue, KeypointDef, etc.)
  main/
    index.ts              Electron main — window creation
    ipc.ts                IPC handlers
    lib/                  Parquet parsing logic
  preload/
    index.ts              contextBridge API surface
  renderer/src/
    main.tsx              React root (MantineProvider)
    App.tsx               Root layout
    store.ts              Zustand store
    theme.ts              Mantine dark theme
    lib/
      fileManager.ts      Path resolution, config parsing
      timecode.ts         Frame ↔ timecode conversion
    hooks/
      useExperimentIO.ts        File open/save orchestration
      useKeyboardShortcuts.ts   Global hotkeys
      useVisibleRange.ts        Visible window around current frame
    components/
      ErrorBoundary.tsx
      MenuBar.tsx
      VideoPane.tsx
      BoutTimeline.tsx
      BoutsPanel.tsx
      BoutInspector.tsx
      playback/
        PlaybackBar.tsx
        PlaybackControls.tsx
        PlaybackSettingsPopover.tsx
        TimelineSlider.tsx
```
