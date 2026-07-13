# Repo Restructure Spec

Following `elibroftw/modern-desktop-app-template` best practices. Applying Karpathy guidelines: simplicity first, surgical changes, goal-driven execution.

## Success criteria

- [x] `src/renderer/src/` flattened to `src/` — all imports updated, paths resolve
- [x] `postcss.config.js` with `postcss-preset-mantine` and breakpoint vars
- [x] `.nvmrc` pinning Node version
- [x] `environment/apt_packages.txt` listing Linux Tauri deps
- [x] `.gitignore` cleaned — remove Python artifacts, stale entries
- [x] `pnpm-workspace.yaml` deleted (Electron hacks removed)
- [x] `package.json` updated: `type: "module"` added, `packageManager` removed (issue with pnpm integrity)
- [x] React 18 → 19 upgrade
- [x] Mantine 7 → 9 upgrade
- [x] Tauri plugins added: `log`, `store`, `window-state`, `single-instance` (JS + Rust)
- [x] `tsc --noEmit` passes
- [x] `vite build` succeeds
- [x] `prettier . --write` passes (no formatting errors)

---

## Phase 1: Flatten directory structure

### 1a. Move files

Move all files from `src/renderer/src/` up to `src/`:

```
src/renderer/src/main.tsx                → src/main.tsx
src/renderer/src/App.tsx                 → src/App.tsx
src/renderer/src/store.ts                → src/store.ts
src/renderer/src/theme.ts                → src/theme.ts
src/renderer/src/components/*            → src/components/*
src/renderer/src/hooks/*                 → src/hooks/*
src/renderer/src/lib/*                   → src/lib/*
```

Then remove the empty `src/renderer/` directory.

### 1b. Update internal imports

Current import pattern → new import pattern:

| From         | Current                             | New                           |
| ------------ | ----------------------------------- | ----------------------------- |
| store.ts     | `../../shared/types`                | `./shared/types`              |
| store.ts     | `./lib/frameReader`                 | (unchanged)                   |
| components/* | `../store`                          | (unchanged)                   |
| components/* | `../lib/*`                          | (unchanged)                   |
| components/* | `../hooks/*`                        | (unchanged)                   |
| components/* | `../../../shared/types`             | `../shared/types`             |
| components/* | `../../../shared/behavysisContract` | `../shared/behavysisContract` |
| hooks/*      | `../../../shared/types`             | `../shared/types`             |
| hooks/*      | `../../../shared/behavysisContract` | `../shared/behavysisContract` |
| hooks/*      | `../store`                          | (unchanged)                   |
| hooks/*      | `../lib/*`                          | (unchanged)                   |
| lib/*        | `../../../shared/types`             | `../shared/types`             |
| lib/*        | `../../../shared/behavysisContract` | `../shared/behavysisContract` |
| playback/*   | `../../store`                       | `../store`                    |
| playback/*   | `../../lib/timecode`                | `../lib/timecode`             |
| main.tsx     | `./theme`                           | (unchanged)                   |
| main.tsx     | `./App`                             | (unchanged)                   |
| main.tsx     | `./components/ErrorBoundary`        | (unchanged)                   |

### 1c. Update config files

- `index.html`: `/src/renderer/src/main.tsx` → `/src/main.tsx`
- `tsconfig.json`: `src/renderer/src/**/*` → `src/**/*` (keep `src/shared/**/*`)
- `vite.config.ts`: verify no hardcoded paths (should be fine)
- `eslint.config.mjs`: verify no hardcoded paths (should be fine)
- `tauri.conf.json`: verify frontendDist and devUrl (should be fine)

---

## Phase 2: Dev infrastructure

### 2a. Add postcss.config.js

```js
export default {
  plugins: {
    "postcss-preset-mantine": {},
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em",
        "mantine-breakpoint-sm": "48em",
        "mantine-breakpoint-md": "62em",
        "mantine-breakpoint-lg": "75em",
        "mantine-breakpoint-xl": "88em",
      },
    },
  },
};
```

Requires: `pnpm add -D postcss-preset-mantine postcss-simple-vars postcss`

### 2b. Add .nvmrc

Pin to Node 22 (Tauri 2 recommends 22+). Run `node -v > .nvmrc`.

### 2c. Add environment/apt_packages.txt

Tauri Linux system deps for documentation.

### 2d. Clean .gitignore

Remove: Python artifacts (`__pycache__/`, `*.py[oc]`, `build/`*, `wheels/`, `*.egg-info`, `.venv`), stale `out/` dir. Add `*.log`, `stats.html`.

*Note: `build/` in .gitignore was for Python; Vite outputs to `dist/`, Tauri Rust outputs to `src-tauri/target/`. Both already ignored.

### 2e. Clean pnpm-workspace.yaml

Delete it — no need for a workspace in a single-package Tauri app. Set `packageManager` in `package.json` instead.

### 2f. Add packageManager field

```json
"packageManager": "pnpm@10.10.0+sha512.d615db246fe70f25dcfea6d8d73dee782ce23e2245e3c4f6f888249fb568149318637dca73c2c5c8ef2a4ca0d5657fb9567188bfab47f566d1ee6ce987815c39"
```

---

## Phase 3: Version upgrades

### 3a. React 18 → 19

**Breaking changes that affect us:**

- `ReactDOM.createRoot` API unchanged (we already use it)
- `defaultProps` on function components silently ignored (we don't use them)
- `forwardRef` replaced by `ref` as prop (we don't use forwardRef)
- `useRef` requires argument (we already pass one)
- No other breaking changes in our codebase

**Migration:**

```bash
pnpm add react@^19 react-dom@^19
pnpm add -D @types/react@^19 @types/react-dom@^19
```

### 3b. Mantine 7 → 9

**Breaking changes that affect us:**

- Style imports: `@mantine/core/styles.css` → `@mantine/core/styles.css` (same path, but may need layer imports in some setups)
- `@mantine/core/styles.layer.css` available if CSS order matters
- `postcss-preset-mantine` setup required (adding in Phase 2)
- Component APIs: `Slider`, `Tabs`, `Select`, `MultiSelect`, `Popover`, etc. — mostly backward compatible from v7→v9
- `createTheme` API unchanged
- `useMantineTheme` API unchanged

**Migration:**

```bash
pnpm add @mantine/core@^9 @mantine/hooks@^9
pnpm add -D postcss-preset-mantine postcss-simple-vars postcss
```

### 3c. Tauri plugins (JS + Rust)

**Add JS packages:**

```bash
pnpm add @tauri-apps/plugin-log @tauri-apps/plugin-store @tauri-apps/plugin-window-state @tauri-apps/plugin-single-instance
```

**Add Rust crates in Cargo.toml:**

```toml
tauri-plugin-log = "2"
tauri-plugin-store = "2"
tauri-plugin-window-state = "2"
tauri-plugin-single-instance = "2"
```

**Register in lib.rs:**

```rust
.plugin(tauri_plugin_log::Builder::new().build())
.plugin(tauri_plugin_store::Builder::new().build())
.plugin(tauri_plugin_window_state::Builder::default().build())
.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| { ... }))
```

**Update capabilities/default.json:**
Add permissions for the new plugins.

---

## Verification Results (2026-07-14)

All success criteria met.

### TypeScript
```
$ pnpm typecheck
$ tsc --noEmit
(no errors)
```

### Build
```
$ pnpm build
✓ built in 2.63s
dist/index.html          0.40 kB
dist/assets/index.css  227.49 kB
dist/assets/index.js  1225.26 kB
```

### Format
```
$ pnpm format
prettier . --write
(all files unchanged)
```

### Lint
11 pre-existing errors (not introduced by changes). All in source files with prior issues:
- `frameReader.ts`: empty catch blocks, `any` types (5 errors)
- `BoutInspector.tsx`, `FeatureGraph.tsx`, `useKeyboardShortcuts.ts`: unused `videoMetadata` (3 errors)
- `FeaturesPanel.tsx`: unused `Text` import (1 error)
- `timecode.ts`: unused assignment (1 error)

None introduced by this restructure.

### Deviations from spec

1. **`packageManager` field removed**: Caused `Cannot use 'in' operator to search for 'integrity' in undefined` error with pnpm v11.0.9. Added `"type": "module"` instead for ESM support.
2. **`@tauri-apps/plugin-single-instance` not in npm deps**: This plugin is Rust-only (no npm package exists). Kept in Cargo.toml and lib.rs only.
3. **Kept `forceColorScheme="dark"` in main.tsx**: Prior codebase uses this; not changed to avoid behavioral changes.
4. **ESLint config updated**: Changed from glob `**/*.{js,ts}` to scoped `src/**/*.{js,ts,tsx}` with proper ignores for `dist/`, `src-tauri/`, `node_modules/`.

### Final dependency versions
- React 19.2.7, React DOM 19.2.7
- Mantine Core 9.4.1, Mantine Hooks 9.4.1
- Tauri CLI 2.5.0, Tauri API 2.5.0
- Tauri plugins: dialog 2.2.2, fs 2.2.1, log 2.8.0, store 2.4.3, window-state 2.4.1
- Vite 5.4.21, TypeScript 5.9.3
- Node 24.15.0, pnpm 11.0.9
