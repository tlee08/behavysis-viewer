# Behavysis Viewer

Electron app for reviewing binary classifier output from the Behavysis pipeline.

## Commands

```bash
pnpm install      # use pnpm (pnpm-lock.yaml, pnpm-workspace.yaml); npm will break native builds
pnpm dev          # dev server with HMR (electron-vite)
pnpm build        # production build → out/
pnpm typecheck    # tsc --noEmit via tsconfig.json project references
```

## Architecture

- **Electron-vite**: `src/main/` (Electron main), `src/preload/` (contextBridge), `src/renderer/` (React 18)
- **Build output**: `out/` — main entry is `out/main/index.js`
- **Main process** is pure file I/O (IPC handlers in `src/main/ipc.ts`); all parquet/arrow parsing happens in the renderer
- **`window.electron`** — preload bridge, typed as `ElectronAPI` in `src/preload/index.ts`
- **`sandbox: false`** in `src/main/index.ts` is required because the preload script uses Node `path`/`url` modules
- **Video loading**: videos are loaded as `Blob` → `URL.createObjectURL` in the renderer (`useExperimentIO.ts`). `webSecurity` stays at its default (`true`). The `readFile` IPC handler returns the raw bytes.

## Key Dependencies

- `parquet-wasm` requires `wasm()` and `topLevelAwait()` Vite plugins and is excluded from `optimizeDeps` — configured in `electron.vite.config.ts`
- Zustand for state management (single store in `src/renderer/src/store.ts`)
- `pnpm-workspace.yaml` has `allowBuilds` for electron, esbuild, @swc/core — required for native module builds

## Python Tooling

- Uses `uv` for Python dependency management (uv.lock, pyproject.toml)
- Python ≥3.14 required (`.python-version`)
- Pandas/PyArrow for parquet manipulation outside the app
