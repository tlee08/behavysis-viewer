# AGENTS.md — Behavysis Viewer

## Setup & commands

- **pnpm** only (lockfile is `pnpm-lock.yaml`)
- `node-linker=hoisted` in `.npmrc` — required for native deps (nodejs-polars)
- `pnpm install` runs `electron-builder install-app-deps` via `postinstall` for native modules

| Command              | What it does                               |
| -------------------- | ------------------------------------------ |
| `pnpm run dev`       | electron-vite dev with HMR                 |
| `pnpm run build`     | electron-vite prod build → `out/`          |
| `pnpm run typecheck` | `tsc --noEmit` (references both tsconfigs) |
| `pnpm run package`   | `build` then `electron-builder` → `dist/`  |

Run `typecheck` after any changes to shared types or IPC interfaces.

## Architecture

Classic Electron 3-process layout, built with **electron-vite** (Vite-based, not webpack):

```
src/
  main/       Electron main process — IPC handlers + parquet parsing via nodejs-polars
  preload/    contextBridge → window.electron API surface
  renderer/   React 18 + Mantine UI + Vite, entry: src/renderer/index.html → src/main.tsx
  shared/     types.ts — the single source-of-truth type definitions used by all 3 processes
```

**electron-vite** config in `electron.vite.config.ts` applies `externalizeDepsPlugin()` to main & preload, and `@vitejs/plugin-react` to renderer. Build output goes to `out/main/`, `out/preload/`, `out/renderer/`.

### TypeScript config

Two composite tsconfigs referenced from root `tsconfig.json`:

- `tsconfig.node.json` — main + preload (CommonJS modules, types from `electron-vite/node`)
- `tsconfig.web.json` — renderer (ESNext modules, React JSX, DOM libs)

`tsc --noEmit` checks both. If you add a file to `src/shared/`, it's already included in both.

## Data flow

1. User opens config JSON → `useExperimentIO.ts` resolves paths (`fileManager.ts`), reads video, parses parquet via IPC
2. Main-process IPC handlers (`src/main/ipc.ts`) invoke `nodejs-polars` to read/write parquet
3. Zustand store (`src/renderer/src/store.ts`) is the **single source of truth** — all state lives here
4. Components access state via `useStore()` hook; mutations via store actions
5. Save writes scored bouts back to parquet in-place (overwrites `7_scored_behavs/{name}.parquet`)

## Parquet format (critical)

Behaviour parquet uses 2-level column names:

- **Old** (Python tuple): `('attack', 'actual')`
- **New** (flat): `attack__actual`

`parseTuple2()` in `src/main/lib/columnNames.ts` handles both. **Saving always writes new format only** and drops all `pred` columns.

Keypoints parquet uses 4-level DLC tuples: `('DLC_scorer', 'mouse1', 'Nose', 'x')`.

Column discovery and format migration logic is in:

- `src/main/lib/parseBehav.ts` — frames→bouts via run-length encoding, legacy `pred` column migration
- `src/main/lib/saveBehav.ts` — writes back new format, drops old variants
- `src/main/lib/columnNames.ts` — tuple/flat name parsing
- `src/main/lib/parquetUtils.ts` — `getRow0Frame()`: reads `__index_level_0__` or `frame` column to get 0-based offset

## Directory convention for experiments

Config path: `0_config/{name}.json`
Other paths resolved relative to parent directory:

- Video: `2_formatted_vid/{name}.mp4`
- Behavs: `7_scored_behavs/{name}.parquet`
- Keypoints: `4_preprocessed/{name}.parquet`

Logic in `src/renderer/src/lib/fileManager.ts:resolveExperimentPaths()`.

## Store conventions

- `Zustand v5` — use `useStore(fn)` with selectors for performance, or `useStore.getState()` outside React
- Bout `id` is the index in the `bouts` array (reassigned after every parse); never assume persistence
- All `ActualValue` constants exported from `src/shared/types.ts`: `TRUE_POS=1`, `FALSE_POS=-1`, `TRUE_NEG=0`, `UNSURE=-2`
- Bout editing uses `interimBoutEdit` (optimistic drag state in timeline), committed via `updateBoutRange`

## Key dependencies & gotchas

- **nodejs-polars** (native) — parquet I/O runs in main process only; exposes `pl.readParquet()`, `pl.DataFrame`, `pl.Series`, `pl.Int8`
- **Konva/react-konva** — canvas keypoint overlay rendered in VideoPane
- **react-resizable-panels** — main layout (video+timeline | bout list+inspector)
- **@tanstack/react-virtual** — virtualized bout list in BoutsPanel
- `sandbox: false` in BrowserWindow — required because preload uses Node `path` module
- No DataGraphPane component is implemented yet; the README mentions it but the code (`store.ts`) has no `graphSeries`/`addGraphSeries` fields

## Style conventions

- No trailing semicolons (TypeScript files consistently omit them)
- Double quotes for string literals
- Implicit return arrow functions preferred
- Components are named exports (not default), except `App.tsx`
- No linting or formatting scripts are configured — manually match surrounding style
