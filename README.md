# Behavysis Viewer (TypeScript/Electron)

A desktop app for reviewing binary classifier output from the [Behavysis](https://github.com/tlee08/behavysis) pipeline.

## Setup

```bash
npm install
npm run dev       # development with hot reload
npm run build     # production build
```

## Usage

1. **Open** — File > Open, select a `0_configs/{name}.json` config file.  
   All other paths (video, parquet) are resolved automatically from the same directory tree.
2. **Review bouts** — click a bout in the list, or click a bar in the timeline.
3. **Score** — use the IS / NOT / UNSURE radio buttons, or hotkeys `1` / `2` / `3`.
4. **Save** — writes the scored parquet back to `7_scored_behavs/{name}.parquet`.

### Hotkeys

| Key | Action |
|-----|--------|
| `Space` | Play / pause |
| `←` / `→` | Jump ±5 seconds |
| `K` | Toggle keypoint overlay |
| `F` | Toggle focus mode (pause at bout end) |
| `R` | Replay selected bout |
| `1` / `2` / `3` | Score bout as IS / NOT / UNSURE |

## Parquet column format

The behaviour parquet uses pandas-style 2-level MultiIndex column names stored
as Python tuple strings, e.g. `"('attack', 'actual')"`.  If your pipeline writes
a different format (e.g. flat `attack__actual`) edit `parseBehavColumns` in
`src/renderer/src/lib/parseParquet.ts`.

Keypoints follow the DLC 4-level format:  
`"('DLC_scorer', 'mouse1marked', 'Nose', 'x')"` — or flat `mouse1marked_Nose_x`.

## Adding extra data graph panes

Any per-frame scalar series can be displayed below the bout timeline.
From anywhere in the renderer, call:

```typescript
const { addGraphSeries } = useStore.getState()
addGraphSeries({
  label: 'Mouse speed (mm/s)',
  color: '#f472b6',
  values: speedFloat32Array,  // index = frame number
})
```

Then mount a `<DataGraphPane>` in `App.tsx`:

```tsx
{graphSeries.map((s) => (
  <DataGraphPane key={s.label} series={s} width={VIDEO_WIDTH} height={70} />
))}
```

This is already wired up — just add series to the store and they appear automatically.

## Project structure

```
src/
  main/
    index.ts         Electron main — window creation
    ipc.ts           IPC handlers (file I/O only; no parsing)
  preload/
    index.ts         contextBridge API surface
  renderer/src/
    types.ts         Shared types
    store.ts         Zustand store (single source of truth)
    App.tsx          Layout + keyboard shortcuts + file I/O orchestration
    lib/
      fileManager.ts Path resolution + config parsing
      parseParquet.ts parquet-wasm + apache-arrow parsing for both DFs
      bouts.ts       frames ↔ bouts conversion (run-length encoding)
      colors.ts      Colour generation for keypoints
    components/
      VideoPane.tsx       HTML5 video + canvas keypoint overlay
      BoutTimeline.tsx    Canvas Gantt chart of bouts
      DataGraphPane.tsx   uplot scrolling line chart (extensibility hook)
      BoutsPanel.tsx      Scrollable bout list
      BoutInspector.tsx   IS/NOT/UNSURE + sub-behaviour checkboxes
```
