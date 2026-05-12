# Behavysis Viewer — UI Beautification & Modularization Proposal

## Overview

Replace 9 components' inline `style` props and a handwritten `styles.css` with [Mantine v7](https://mantine.dev/) — a dark-theme-first React component library. Decompose the monolithic `PlaybackBar` (57 lines, 5 concerns) into composable sub-components. Standardize styling through Mantine's theme tokens and layout primitives so future graph tabs and annotation overlays slot in without refactoring.

**This is the synthesis of [deepseek_style_implementation.md](./deepseek_style_implementation.md) and [glm_style_implementation.md](./glm_style_implementation.md), with anti-patterns from both removed.**

---

## 0. Assumptions

| # | Assumption | Risk if wrong |
|---|-----------|--------------|
| A1 | App stays dark-mode only. Mantine's `colorScheme` toggle is available but we're not building a light mode. | Low — Mantine themes work either way. |
| A2 | `pnpm` is the package manager (matches current `package.json`). | Low — swap to `npm` if needed. |
| A3 | `electron-vite` with Vite 5.x (current). Mantine v7 CSS layers work with Vite without PostCSS config. | Medium — if Mantine CSS doesn't load, we add PostCSS. |
| A4 | `react-resizable-panels` stays for the split-pane layout. Mantine has no equivalent. | Low — it already works and is a peer dependency. |
| A5 | No routing/page changes. Single-page app stays single-page. | Low — no requirement to change this. |
| A6 | Canvas-based components (BoutTimeline, VideoPane keypoints) keep their canvas rendering logic. We only change how they access colors (via `useMantineTheme()` hook). | Low — canvas logic is working, don't touch it. |

---

## 1. Anti-Patterns Avoided

Both referenced docs contain decisions that would add complexity without value. We explicitly reject them:

### 1.1 Rejected: `components/ui/` wrapper layer

**What the GLM doc proposes:** Wrap every Mantine component in a custom file:
```
components/ui/Button/Button.tsx       # just renders <MantineButton {...props} />
components/ui/Slider/Slider.tsx        # just renders <MantineSlider {...props} />
components/ui/Toggle/Toggle.tsx        # just renders <Switch label={label} {...props} />
```

**Why rejected:** This is an abstraction with zero value-add. Mantine components ARE the primitives. A wrapper layer:
- Must be updated every time Mantine adds a prop
- Forces developers to learn the wrapper API instead of using Mantine docs
- Creates ~8 extra files for no functional benefit
- Violates YAGNI : "You aren't gonna need it"

**Instead:** Use Mantine components directly. `import { Button, Slider, Switch } from '@mantine/core'`.

### 1.2 Rejected: Deeply nested component directories

**What the GLM doc proposes:**
```
components/playback/PlaybackBar/PlaybackBar.tsx
components/playback/PlaybackBar/index.ts          # re-exports from PlaybackBar.tsx
components/playback/PlaybackBar/PlaybackBar.styles.ts
```

**Why rejected:** The extra directory level per component adds ceremony. A flat structure:
```
components/playback/PlaybackBar.tsx
components/playback/PlaybackControls.tsx
```
...is functionally identical and has fewer files to navigate. Sub-directories per component make sense when a component has 3+ co-located files (tests, stories, types, styles). None of our components meet that threshold.

**Instead:** Flat structure within each feature directory. `index.ts` barrel export only at the feature directory level.

### 1.3 Rejected: `createStyles` / per-component `.styles.ts` files

**What both docs propose:** `createStyles((theme) => ({ ... }))` in separate `ComponentName.styles.ts` files.

**Why rejected:**
- `createStyles` requires `@mantine/emotion` (separate package, not in Mantine core v7)
- For components this small (10-50 lines), a separate styles file is premature decomposition
- Mantine's `style` prop accepts theme callbacks: `style={(theme) => ({ color: theme.colors.dark[0] })}`
- Most styling is handled by Mantine props (`bg`, `c`, `p`, `gap`), not custom CSS

**Instead:** Use Mantine's built-in style system: `style` prop callbacks, `bg`/`c`/`p` props, and `Box`/`Group`/`Stack` layout primitives. Only extract to a shared constant if the same style object is used in 3+ places (currently zero such cases).

### 1.4 Rejected: PostCSS config

**What the DeepSeek doc proposes:** `postcss.config.cjs` with `postcss-preset-mantine` and `postcss-simple-vars`.

**Why rejected:** These plugins are for Mantine v6's CSS-in-JS approach. Mantine v7 uses native CSS layers via `@mantine/core/styles.css`. Vite processes this CSS out of the box. The PostCSS config is unnecessary and adds a dependency that could break on upgrades.

**Instead:** Just import `@mantine/core/styles.css` in `main.tsx`. No PostCSS config needed.

### 1.5 Rejected: App-wide `Button.extend()` defaultProps

**What the DeepSeek doc proposes:** Setting `variant: 'subtle'` and `size: 'xs'` as defaults for ALL Buttons via theme `components.ts`.

**Why rejected:** This is overly broad. MenuBar buttons should be `subtle` + `xs`, but a future "Export" button or "Confirm" dialog button should use `filled` + `sm`. Setting global defaults constrains all future button usage.

**Instead:** Apply `variant` and `size` as per-instance props, only where needed. The repetition of two props across 3 MenuBar buttons is acceptable.

---

## 2. Dependencies

```bash
pnpm add @mantine/core @mantine/hooks @tabler/icons-react
```

| Package | Purpose | Replaces |
|---------|---------|----------|
| `@mantine/core` | Component library, theme provider, CSS reset | `styles.css` entirely |
| `@mantine/hooks` | `useHotkeys` (replaces custom `useKeyboardShortcuts`), `useDisclosure` | Part of `hooks/` |
| `@tabler/icons-react` | Play/pause/skip icons | Emoji buttons (▶/⏸/◀/▶) |

No dev dependencies needed. No PostCSS config. No Vite config changes.

---

## 3. Theme

### 3.1 Single file: `src/renderer/src/theme.ts`

Why one file: The app has 9 components. A 90-line theme file doesn't need to be split into `colors.ts`, `components.ts`, and `index.ts`.

```ts
import { createTheme } from '@mantine/core'
import '@mantine/core/styles.css'

export const theme = createTheme({
  // Always dark — matches current app
  defaultColorScheme: 'dark',

  // Map existing slate palette to Mantine's 10-shade dark tuple
  // Shade 0 = lightest (text), shade 9 = darkest (deep bg)
  colors: {
    dark: [
      '#e2e8f0', // 0 — text-primary
      '#cbd5e1', // 1
      '#94a3b8', // 2 — text-dim (labels, timeline)
      '#64748b', // 3 — text-muted (status, frame info)
      '#475569', // 4 — border-hover, axis lines
      '#334155', // 5 — border, input-bg
      '#1e293b', // 6 — panel-bg (PlaybackBar, MenuBar)
      '#0f172a', // 7 — primary-bg (App root, BoutsPanel)
      '#020617', // 8
      '#000000', // 9
    ],
    blue: [
      '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd',
      '#60a5fa', // 4 — matches current accent (#60a5fa)
      '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
    ],
  },

  primaryColor: 'blue',

  // Compact spacing matching current app density
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
  defaultRadius: 'sm',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: 'monospace',
})
```

**Theme token → old color mapping:**

| Mantine token | Old hex | Usage |
|--------------|---------|-------|
| `dark.0` | `#e2e8f0` | Primary text |
| `dark.2` | `#94a3b8` | Dim text / labels |
| `dark.3` / `dimmed` | `#64748b` | Muted text / status |
| `dark.4` | `#475569` | Borders, hover |
| `dark.5` | `#334155` | Input backgrounds |
| `dark.6` | `#1e293b` | Panel backgrounds |
| `dark.7` | `#0f172a` | App root background |
| `blue.4` | `#60a5fa` | Accent, slider, marker |

### 3.2 MantineProvider setup

**`src/renderer/src/main.tsx`** — before/after:

```diff
- import './styles.css'
+ import '@mantine/core/styles.css'
+ import { MantineProvider } from '@mantine/core'
+ import { theme } from './theme'

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
+     <MantineProvider theme={theme} defaultColorScheme="dark">
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
+     </MantineProvider>
    </StrictMode>,
  )
```

Then **delete `src/renderer/src/styles.css`** — Mantine's CSS reset replaces all 53 lines.

---

## 4. Component Architecture

### 4.1 Directory Structure (post-migration)

```
src/renderer/src/
├── main.tsx                          # +MantineProvider, -styles.css import
├── theme.ts                          # ★ NEW — single theme file
├── store.ts                          # +extensibility stubs (§5)
├── constants.ts                      # (unchanged)
├── types.ts                          # (unchanged)
├── components/
│   ├── App.tsx                       # ♻ Box/Stack layout primitives
│   ├── ErrorBoundary.tsx             # ♻ Mantine Alert + Code
│   ├── playback/
│   │   ├── index.ts                  # ★ NEW — barrel export
│   │   ├── PlaybackBar.tsx           # ★ NEW — container (was monolithic)
│   │   ├── PlaybackControls.tsx      # ★ NEW — play/pause/skip buttons
│   │   ├── TimelineSlider.tsx        # ★ NEW — frame scrub slider
│   │   ├── PlaybackOptions.tsx       # ★ NEW — Keypoints + Focus toggles
│   │   └── SpeedSelector.tsx         # ★ NEW — playback rate dropdown
│   ├── MenuBar.tsx                   # ♻ Mantine Button + Group
│   ├── BoutInspector.tsx             # ♻ Mantine Radio + Checkbox + Paper
│   ├── BoutsPanel.tsx                # ♻ Mantine Box + Text (virtualizer kept)
│   ├── BoutTimeline.tsx              # ♻ useMantineTheme() for canvas colors
│   ├── DataGraphPaneECharts.tsx      # ♻ useMantineTheme() for ECharts colors
│   └── VideoPane.tsx                 # ♻ Box container only
```

**Legend:** ★ NEW = new file, ♻ = rewritten/modified

### 4.2 PlaybackBar — Decomposition

The current 57-line monolithic component handles 5 separate concerns. We split into:

```
PlaybackBar (container, ~25 lines)
├── PlaybackControls    — play/pause + skip back/forward (Tabler icons)
├── TimelineSlider      — full-width frame scrubber (Mantine Slider)
├── TimeDisplay         — inline `{minutes}:{seconds}` (Mantine Text, inline)
├── SpeedSelector       — playback rate dropdown (Mantine Select)
└── PlaybackOptions     — Keypoints + Focus toggles (Mantine Switch)
```

**Design rationale:**
- Each sub-component reads from `useStore()` directly — no prop drilling through PlaybackBar. This keeps the container thin and sub-components independently testable.
- TimeDisplay stays inline in PlaybackBar (3 lines of JSX), not extracted to its own file. It's a single `<Text>` element. Extracting it would be over-decomposition.

#### PlaybackBar.tsx (container)

```tsx
import { Group, Box, Text } from '@mantine/core'
import { PlaybackControls } from './PlaybackControls'
import { TimelineSlider } from './TimelineSlider'
import { PlaybackOptions } from './PlaybackOptions'
import { SpeedSelector } from './SpeedSelector'
import { useStore } from '../store'

export function PlaybackBar() {
  const { currentFrame, config } = useStore()
  const fps = config?.fps ?? 15
  const seconds = Math.round(currentFrame / fps)
  const timeStr = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`

  return (
    <Group
      gap="xs"
      px="xs"
      py={4}
      bg="dark.6"
      wrap="nowrap"
      align="center"
      style={{ flexShrink: 0 }}
    >
      <PlaybackControls />

      <Box style={{ flex: 1, minWidth: 120 }}>
        <TimelineSlider />
      </Box>

      <Text size="xs" c="dimmed" ff="monospace" w={36} ta="right">
        {timeStr}
      </Text>

      <SpeedSelector />
      <PlaybackOptions />
    </Group>
  )
}
```

#### PlaybackControls.tsx

Replaces emoji buttons (▶/⏸, ◀ 5s, 5s ▶) with Tabler icons. Play/pause button uses `variant="filled" color="blue"` to stand out as the primary transport control.

```tsx
import { Group, ActionIcon } from '@mantine/core'
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
} from '@tabler/icons-react'
import { useStore } from '../store'
import { JUMP_FRAMES } from '../constants'

export function PlaybackControls() {
  const { currentFrame, isPlaying, numFrames, config, setIsPlaying, panToFrame } = useStore()
  const fps = config?.fps ?? 15

  return (
    <Group gap={4}>
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => panToFrame(Math.max(0, currentFrame - JUMP_FRAMES(fps)))}
      >
        <IconPlayerSkipBackFilled size={18} />
      </ActionIcon>

      <ActionIcon
        variant="filled"
        color="blue"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying
          ? <IconPlayerPauseFilled size={18} />
          : <IconPlayerPlayFilled size={18} />
        }
      </ActionIcon>

      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => panToFrame(Math.min(numFrames - 1, currentFrame + JUMP_FRAMES(fps)))}
      >
        <IconPlayerSkipForwardFilled size={18} />
      </ActionIcon>
    </Group>
  )
}
```

#### TimelineSlider.tsx

```tsx
import { Slider } from '@mantine/core'
import { useStore } from '../store'

export function TimelineSlider() {
  const { currentFrame, numFrames, panToFrame } = useStore()

  return (
    <Slider
      value={currentFrame}
      onChange={panToFrame}
      min={0}
      max={Math.max(numFrames - 1, 0)}
      step={1}
      label={null}
      size="sm"
      color="blue.4"
    />
  )
}
```

**Note:** `label={null}` suppresses the tooltip on drag — important for performance with large frame counts.

#### PlaybackOptions.tsx

Replaces native `<input type="checkbox">` + `<label>` combos with Mantine `Switch`.

```tsx
import { Group, Switch } from '@mantine/core'
import { useStore } from '../store'

export function PlaybackOptions() {
  const { showKeypoints, setShowKeypoints, focusBout, setFocusBout } = useStore()

  return (
    <Group gap="sm">
      <Switch
        label="Keypoints"
        checked={showKeypoints}
        onChange={(e) => setShowKeypoints(e.currentTarget.checked)}
        size="xs"
      />
      <Switch
        label="Focus"
        checked={focusBout}
        onChange={(e) => setFocusBout(e.currentTarget.checked)}
        size="xs"
      />
    </Group>
  )
}
```

#### SpeedSelector.tsx

```tsx
import { Select } from '@mantine/core'
import { useStore } from '../store'

const SPEEDS = ['0.25', '0.5', '1', '1.5', '2']

export function SpeedSelector() {
  const { vidSpeed, setVidSpeed } = useStore()

  return (
    <Select
      data={SPEEDS.map((s) => ({ value: s, label: `${s}x` }))}
      value={vidSpeed.toString()}
      onChange={(v) => v && setVidSpeed(Number(v))}
      size="xs"
      w={70}
      allowDeselect={false}
    />
  )
}
```

#### components/playback/index.ts

```ts
export { PlaybackBar } from './PlaybackBar'
```

### 4.3 App.tsx Migration

Replace `<div>` wrappers with Mantine layout primitives (`Box`, `Group`/`Stack` from Mantine, keep `Panel`/`Separator` from react-resizable-panels).

```tsx
import { Box } from '@mantine/core'
import { Group, Panel, Separator } from 'react-resizable-panels'
// ... component imports unchanged

export default function App() {
  // ... hooks unchanged

  return (
    <Box
      bg="dark.7"
      c="dark.0"
      style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
    >
      <MenuBar onOpen={open} onSave={save} onSaveJson={saveJson} status={status} />

      <Group orientation="horizontal" style={{ flex: 1, overflow: 'hidden' }}>
        <Panel defaultSize={40} minSize={20}>
          <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box style={{ flexShrink: 0 }}>
              <VideoPane videoUrl={videoUrl} />
            </Box>
            <BoutTimeline height={120} />
            {graphSeries.map((s) => (
              <DataGraphPane key={s.label} series={s} height={100} />
            ))}
            <PlaybackBar />
          </Box>
        </Panel>

        <Separator style={{ width: 4, background: 'var(--mantine-color-dark-5)' }} />

        <Panel defaultSize={60} minSize={20}>
          <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box style={{ flex: 1, overflow: 'hidden' }}>
              <BoutsPanel />
            </Box>
            <Box
              bg="dark.7"
              style={{
                flexShrink: 0,
                minHeight: 140,
                borderTop: '1px solid var(--mantine-color-dark-6)',
              }}
            >
              <BoutInspector />
            </Box>
          </Box>
        </Panel>
      </Group>
    </Box>
  )
}
```

**Key change:** Separator background changed from hardcoded `#334155` to `var(--mantine-color-dark-5)` so it tracks the theme.

### 4.4 MenuBar.tsx

Replace `<button className="menu-btn">` + `<span>` with Mantine `Button` + `Text`.

```tsx
import { Group, Button, Text } from '@mantine/core'

interface Props {
  onOpen: () => void
  onSave: () => void
  onSaveJson: () => void
  status: string
}

export function MenuBar({ onOpen, onSave, onSaveJson, status }: Props) {
  return (
    <Group gap="xs" px="xs" py={4} bg="dark.6" style={{ flexShrink: 0 }}>
      <Button variant="subtle" size="xs" onClick={onOpen}>Open</Button>
      <Button variant="subtle" size="xs" onClick={onSave}>Save</Button>
      <Button variant="subtle" size="xs" onClick={onSaveJson}>Save bouts JSON</Button>

      <Text
        size="xs"
        c="dimmed"
        ff="monospace"
        style={{ marginLeft: 'auto', alignSelf: 'center' }}
      >
        {status}
      </Text>
    </Group>
  )
}
```

### 4.5 BoutInspector.tsx

Replace `<fieldset>`/`<legend>` + native radio/checkbox with Mantine `Paper` + `Radio.Group` + `Checkbox`.

```tsx
import { Paper, Text, Radio, Stack, Checkbox, Group } from '@mantine/core'
import { useStore } from '../store'
import type { ActualValue } from '../types'
import { ACTUAL_COLORS } from '../types'

const ACTUAL_OPTIONS: { label: string; value: ActualValue }[] = [
  { label: 'IS behaviour', value: 1 },
  { label: 'NOT behaviour', value: 0 },
  { label: 'Not sure', value: -1 },
]

export function BoutInspector() {
  const { bouts, selectedBoutId, updateBoutActual, updateBoutUserDefined } = useStore()
  const bout = bouts.find((b) => b.id === selectedBoutId)

  if (!bout) {
    return <Text c="dark.4" size="xs" p="sm">Select a bout to inspect</Text>
  }

  return (
    <Stack gap="xs" p="xs">
      <Group gap="xs">
        <Text fw={600} ff="monospace" size="sm" c={ACTUAL_COLORS[bout.actual]}>
          {bout.behav}
        </Text>
        <Text size="sm" c="dimmed">#{bout.id}</Text>
      </Group>

      <Paper withBorder p="xs" bg="dark.7">
        <Text size="xs" c="dark.2" mb={4}>Scoring</Text>
        <Radio.Group
          value={bout.actual.toString()}
          onChange={(v) => updateBoutActual(bout.id, Number(v) as ActualValue)}
        >
          <Stack gap={4}>
            {ACTUAL_OPTIONS.map(({ label, value }) => (
              <Radio
                key={value}
                value={value.toString()}
                label={label}
                color={ACTUAL_COLORS[value]}
                size="xs"
              />
            ))}
          </Stack>
        </Radio.Group>
      </Paper>

      {Object.keys(bout.userDefined).length > 0 && (
        <Paper withBorder p="xs" bg="dark.7">
          <Text size="xs" c="dark.2" mb={4}>Sub-behaviours</Text>
          <Stack gap={4}>
            {Object.entries(bout.userDefined).map(([key, val]) => (
              <Checkbox
                key={key}
                label={key}
                checked={val === 1}
                onChange={(e) => updateBoutUserDefined(bout.id, key, e.currentTarget.checked ? 1 : 0)}
                color="green"
                size="xs"
              />
            ))}
          </Stack>
        </Paper>
      )}

      <Text size="xs" c="dimmed" ff="monospace">
        frames {bout.start} – {bout.stop}
      </Text>
    </Stack>
  )
}
```

### 4.6 BoutsPanel.tsx

Minimal changes — keep the virtualizer logic, replace divs with Mantine `Box`/`Text`, use theme tokens for colors.

```tsx
import { useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Box, Text } from '@mantine/core'
import { useStore } from '../store'
import { ACTUAL_COLORS } from '../types'

const ROW_HEIGHT = 30

export function BoutsPanel() {
  const { bouts, selectedBoutId, selectBout, panToFrame, focusSizeFrames } = useStore()
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: bouts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  useEffect(() => {
    if (selectedBoutId !== null) {
      const index = bouts.findIndex((b) => b.id === selectedBoutId)
      if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' })
    }
  }, [selectedBoutId, bouts, virtualizer])

  const handleSelect = (id: number) => {
    selectBout(id)
    const bout = bouts.find((b) => b.id === id)
    if (bout) panToFrame(Math.max(0, bout.start - focusSizeFrames))
  }

  return (
    <Box
      ref={parentRef}
      h="100%"
      bg="dark.7"
      style={{ overflowY: 'auto', border: '1px solid var(--mantine-color-dark-6)', minWidth: 160 }}
    >
      <Box style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const bout = bouts[vItem.index]
          const selected = bout.id === selectedBoutId
          return (
            <Box
              key={bout.id}
              onClick={() => handleSelect(bout.id)}
              bg={selected ? '#1e3a5f' : 'transparent'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: vItem.size,
                transform: `translateY(${vItem.start}px)`,
                borderLeft: `4px solid ${ACTUAL_COLORS[bout.actual]}`,
                borderBottom: '1px solid var(--mantine-color-dark-6)',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
              }}
            >
              <Text size="xs" c={ACTUAL_COLORS[bout.actual]} ff="monospace">{bout.behav}</Text>
              <Text size="xs" c="dimmed" ff="monospace" ml={4}>#{bout.id}</Text>
              <Text size="xs" c="dark.4" ff="monospace" ml="auto">
                f{bout.start}-{bout.stop}
              </Text>
            </Box>
          )
        })}
      </Box>
      {bouts.length === 0 && (
        <Text p="sm" size="xs" c="dark.4">No bouts loaded</Text>
      )}
    </Box>
  )
}
```

**Note:** `#1e3a5f` (selected row bg) is kept as a literal — it's a functional color (selection highlight), not a theme color, and the Mantine dark scale has no exact match.

### 4.7 BoutTimeline.tsx — theme integration only

Canvas rendering logic stays. Only change: access colors via `useMantineTheme()` instead of hardcoded hex. The chart background `#1a1a2e` is intentionally kept different from panel backgrounds for visual distinction.

```tsx
import { useMantineTheme } from '@mantine/core'
// ... rest of imports unchanged

export function BoutTimeline({ height = 120 }: Props) {
  const theme = useMantineTheme()
  // ... in draw():
  ctx.fillStyle = theme.colors.dark[2]         // was '#94a3b8' (labels)
  ctx.strokeStyle = theme.colors.blue[4]       // was '#60a5fa' (marker)
  ctx.strokeStyle = theme.white                 // selected bout outline
  // chart bg '#1a1a2e' stays — deliberate exception
}
```

### 4.8 DataGraphPaneECharts.tsx — theme integration only

Same pattern: `useMantineTheme()` for axis lines, labels, grid, markLine. Chart bg `#1a1a2e` stays.

```tsx
import { useMantineTheme } from '@mantine/core'
// ...

export function DataGraphPaneECharts({ series, height = 80 }: Props) {
  const theme = useMantineTheme()
  // ... in chart.setOption():
  axisLine: { lineStyle: { color: theme.colors.dark[4] } },     // was '#475569'
  axisLabel: { color: theme.colors.dark[2] },                    // was '#94a3b8'
  splitLine: { lineStyle: { color: theme.colors.dark[5] } },     // was '#334155'
  markLine: { lineStyle: { color: theme.colors.blue[4] } },      // was '#60a5fa'
  backgroundColor: '#1a1a2e',  // deliberate exception
}
```

### 4.9 VideoPane.tsx — container only

Keep all video + canvas logic. Replace outer `<div>` with `<Box>`. Canvas drawing already uses per-individual keypoint colors, so minimal change.

```tsx
import { Box } from '@mantine/core'
// ...

return (
  <Box
    pos="relative"
    w="100%"
    style={{ aspectRatio: `${vidDims.w} / ${vidDims.h}`, background: '#111' }}
  >
    <video ... />
    <canvas ... />
  </Box>
)
```

### 4.10 ErrorBoundary.tsx

```tsx
import { Component, type ReactNode } from 'react'
import { Alert, Code } from '@mantine/core'

interface State { error: Error | null }

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  State
> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <Alert color="red" title="Something went wrong" variant="light" m="md">
          <Code block style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </Code>
        </Alert>
      )
    }
    return this.props.children
  }
}
```

---

## 5. Store Extensibility Stubs

Add commented placeholders to `store.ts` for future features. This establishes the type shape now so future implementations don't need to restructure the store.

```ts
// In AppState interface — add after the "Selection" section:

// ── Graph Tabs (future) ─────────────────────────────────────────────
// graphTabDefs: { id: string; label: string; seriesIds: string[] }[]
// activeGraphTab: string | null
// setActiveGraphTab: (tab: string | null) => void

// ── Annotations (future) ────────────────────────────────────────────
// annotationMode: 'none' | 'point' | 'rectangle' | 'polygon'
// setAnnotationMode: (mode: AppState['annotationMode']) => void
```

No implementation code — just the type stubs as comments.

---

## 6. Future Extensibility Patterns

These are NOT implemented now. They document how future features slot into the architecture without refactoring.

### 6.1 Graph Tabs

When we want tabbed graph views (e.g., "Kinematics" / "Neural" / "Events"), the pattern is:

```tsx
// components/data/GraphTabs.tsx (future)
import { Tabs } from '@mantine/core'
import { DataGraphPaneECharts as DataGraphPane } from './DataGraphPaneECharts'
import { useStore } from '../store'

export function GraphTabs() {
  const { graphTabDefs, activeGraphTab, setActiveGraphTab, graphSeries } = useStore()

  if (graphTabDefs.length === 0) {
    // No tabs defined — render all series inline (current behavior)
    return <>{graphSeries.map((s) => <DataGraphPane key={s.label} series={s} height={100} />)}</>
  }

  return (
    <Tabs value={activeGraphTab} onChange={(v) => setActiveGraphTab(v)}>
      <Tabs.List>
        {graphTabDefs.map((def) => (
          <Tabs.Tab key={def.id} value={def.id}>{def.label}</Tabs.Tab>
        ))}
      </Tabs.List>
      {graphTabDefs.map((def) => {
        const tabSeries = graphSeries.filter((s) => def.seriesIds.includes(s.label))
        return (
          <Tabs.Panel key={def.id} value={def.id}>
            {tabSeries.map((s) => <DataGraphPane key={s.label} series={s} height={100} />)}
          </Tabs.Panel>
        )
      })}
    </Tabs>
  )
}
```

Slot into `App.tsx` where `graphSeries.map(...)` currently is. Backward-compatible: if no tabs are defined, it renders exactly as today.

### 6.2 Annotation Overlay on Video

When we want annotation tools (point, rectangle, polygon) overlaid on the video:

```tsx
// components/AnnotationControls.tsx (future)
import { Group, ActionIcon, Box } from '@mantine/core'
import { IconPointer, IconRectangle, IconPolygon } from '@tabler/icons-react'
import { useStore } from '../store'

export function AnnotationControls() {
  const { annotationMode, setAnnotationMode } = useStore()

  const modes = [
    { mode: 'point' as const, icon: IconPointer },
    { mode: 'rectangle' as const, icon: IconRectangle },
    { mode: 'polygon' as const, icon: IconPolygon },
  ]

  return (
    <Box pos="absolute" top={8} right={8} style={{ zIndex: 10 }}>
      <Group gap={4}>
        {modes.map(({ mode, icon: Icon }) => (
          <ActionIcon
            key={mode}
            variant={annotationMode === mode ? 'filled' : 'subtle'}
            color="blue"
            onClick={() => setAnnotationMode(annotationMode === mode ? 'none' : mode)}
          >
            <Icon size={16} />
          </ActionIcon>
        ))}
      </Group>
    </Box>
  )
}
```

Slot into `VideoPane.tsx` by wrapping the `<video>` + `<canvas>` in a relative container and adding `<AnnotationControls />`. Annotation data rendering (shapes on canvas) is separate from the toggle UI — this pattern keeps them decoupled.

---

## 7. Migration Order

Ordered by risk — each step can be verified independently before proceeding.

| Step | What | Risk | Verify |
|------|------|------|--------|
| 1 | `pnpm add @mantine/core @mantine/hooks @tabler/icons-react` | Low | `pnpm typecheck` passes |
| 2 | Create `theme.ts` | Low — not wired yet | File exists, types check |
| 3 | Update `main.tsx` — wrap MantineProvider, import styles.css, remove `styles.css` | **Medium** — Mantine reset changes global look | App loads, dark bg visible |
| 4 | **Verify milestone:** App renders with MantineProvider, no console errors | — | Visual check + devtools console |
| 5 | Create `components/playback/` sub-components + wire into `App.tsx` | **Medium** — playback is core UX | Play/pause/skip/scrub/speed all work |
| 6 | Migrate `MenuBar.tsx` | Low | Open/Save/Save JSON buttons work |
| 7 | Migrate `App.tsx` layout (Box wrappers, theme tokens for bg/separator) | Medium — layout | Panels resize, colors match |
| 8 | Migrate `BoutInspector.tsx` | Low — scoring workflow | Radio buttons, checkboxes work |
| 9 | Migrate `BoutsPanel.tsx` | Low | Virtualized list scrolls, rows highlight |
| 10 | Update `BoutTimeline.tsx` — `useMantineTheme()` for canvas colors | Low | Timeline renders, colors match |
| 11 | Update `DataGraphPaneECharts.tsx` — `useMantineTheme()` for ECharts colors | Low | Graphs render, axis colors match |
| 12 | Update `VideoPane.tsx` — Box container | Low | Video renders |
| 13 | Migrate `ErrorBoundary.tsx` | Low | Trigger error → Alert renders |
| 14 | Delete `styles.css` | Low | App still works |
| 15 | `pnpm build` | Medium | Build succeeds, app runs from build output |

---

## 8. Success Criteria

After migration, all of the following must pass. These are verifiable — no "looks good" judgments.

### 8.1 Functionality (must match current behavior exactly)

- [ ] App loads without console errors or React warnings
- [ ] Play/Pause button toggles, icon swaps (▶ ↔ ⏸)
- [ ] Skip back 5s and skip forward 5s work
- [ ] Timeline slider scrubs correctly, value matches current frame
- [ ] Speed selector changes playback rate (0.25x, 0.5x, 1x, 1.5x, 2x)
- [ ] Time display shows correct `M:SS` format
- [ ] Keypoints toggle shows/hides keypoint overlay on video
- [ ] Focus toggle pauses video at end of selected bout boundary
- [ ] MenuBar: Open loads experiment, Save saves, Save bouts JSON exports
- [ ] Bout list: virtualized scrolling is smooth, rows highlight on click
- [ ] Selecting a bout pans to its start frame minus focus padding
- [ ] Bout timeline canvas: renders bout bars, clicking selects bout
- [ ] Bout inspector: IS/NOT/Not Sure radio buttons update `bout.actual`
- [ ] Bout inspector: sub-behaviour checkboxes update `bout.userDefined`
- [ ] Data graph panes render, mark line tracks current frame
- [ ] Resizable panels still drag and resize correctly
- [ ] Keyboard shortcuts (`Space` for play/pause, arrow keys, etc.) still work
- [ ] `pnpm build` completes without TypeScript or Vite errors
- [ ] Built app runs and matches dev behavior

### 8.2 Visual (must match the dark theme)

- [ ] App root background is `#0f172a` (dark.7)
- [ ] PlaybackBar background is `#1e293b` (dark.6)
- [ ] MenuBar background is `#1e293b` (dark.6)
- [ ] Primary text is `#e2e8f0` (dark.0)
- [ ] Muted/status text is `#64748b` (dark.3 / dimmed)
- [ ] Slider accent is `#60a5fa` (blue.4)
- [ ] Bout timeline background is `#1a1a2e` (deliberate exception)
- [ ] Data graph backgrounds are `#1a1a2e` (deliberate exception)
- [ ] Selected bout row background is `#1e3a5f` (functional color)
- [ ] No unstyled native browser elements visible (checkboxes, radios, selects all use Mantine versions)

### 8.3 Code quality

- [ ] Zero `style={{ background: '#...' }}` or `style={{ color: '#...' }}` with hardcoded colors (exceptions: `#1a1a2e` for charts, `#1e3a5f` for selection, `#111` for video bg)
- [ ] Zero `<div style={{ display: 'flex', ... }}>` — all layout uses Mantine `Group`/`Stack`/`Box`
- [ ] Zero CSS class references (`className="menu-btn"`, `className="ctrl-btn"`)
- [ ] `styles.css` deleted
- [ ] `pnpm typecheck` passes with zero errors
- [ ] No unused imports in any modified file

---

## 9. Design Decisions

| Decision | Why | Alternative considered |
|----------|-----|------------------------|
| Mantine over shadcn/ui, Chakra, Ant Design | Mantine is dark-theme-first, has the smallest bundle impact, and its component set maps 1:1 to our needs (Button, Slider, Switch, Select, ActionIcon, Radio, Checkbox, Paper, Tabs). shadcn/ui requires Tailwind and is light-mode-first. Chakra v3 is a major breaking change from v2. Ant Design is heavy and doesn't match our compact style. | shadcn/ui + Tailwind — would mean adding a CSS framework to replace 53 lines of CSS. Overkill. |
| Use Mantine components directly (no `ui/` wrappers) | Wrappers add maintenance burden with zero benefit. Mantine IS the UI library. | Wrapping every Mantine component in a custom file. Rejected — see §1.1. |
| Flat component directory (`playback/PlaybackBar.tsx`) vs nested (`playback/PlaybackBar/PlaybackBar.tsx`) | Flat is fewer files, easier to navigate for components with <100 lines. Nested is warranted when a component has co-located tests/stories/styles (3+ files). None of our components meet that threshold. | Nested directories. Rejected — see §1.2. |
| Single `theme.ts` vs `theme/colors.ts` + `theme/components.ts` + `theme/index.ts` | A single 90-line file is simple. Splitting into 3 files for this scale is premature module decomposition. | Split theme files. Rejected — see §1.4. |
| Keep `#1a1a2e` for chart backgrounds | The slightly-blue dark hue distinguishes data visualisation areas from UI panels. Mantine's dark scale is pure slate and doesn't have this exact color. This is a deliberate, documented exception, not a drift from the theme. | Map to `dark.8` (`#020617`) — too dark, loses visual distinction. |
| Keep `#1e3a5f` for selected bout row | This is a functional state color (selection), not a theme color. The Mantine blue scale doesn't have this exact hue. | Map to `blue.9` (`#1e3a8a`) — too blue/strong, would distract. |
| `Switch` over `Checkbox` for Keypoints/Focus toggles | `Switch` is the idiomatic Mantine control for feature toggles (on/off states). `Checkbox` is for selection lists. | `Checkbox` — semantically wrong for toggle states. |
| `ActionIcon variant="filled" color="blue"` for Play/Pause | Visually distinguishes the primary transport control from the skip buttons (which use `variant="subtle"`). | All buttons `variant="subtle"` — harder to find the play button at a glance. |
| Each sub-component calls `useStore()` directly | Avoids prop drilling through PlaybackBar. Sub-components are independently readable. | Pass all state as props from PlaybackBar — more boilerplate, PlaybackBar becomes a props-forwarding shell. |
| `react-resizable-panels` stays | Mantine has no resizable split pane. Replacing it would mean adding another dependency or building from scratch. | Build custom split pane — unnecessary when existing library works. |
| Emoji buttons replaced with Tabler icons | Tabler icons are crisp, scale with `size` prop, and are the standard Mantine icon companion. Emojis render differently across OSes and look unpolished in a desktop app. | Keep emojis — inconsistent rendering across platforms. |
| `label={null}` on TimelineSlider | Suppresses Mantine's default tooltip label on drag. For frame counts in the thousands, rendering a tooltip every frame causes jank. | Show tooltip — performance issue on drag with large datasets. |

---

## 10. Summary

| Metric | Before | After |
|--------|--------|-------|
| CSS approach | 53-line `styles.css` + inline `style` props with hardcoded hex | Mantine theme tokens + `@mantine/core/styles.css` |
| Color management | 12+ hardcoded hex values across files | 2 color tuples (dark, blue) in `theme.ts` + 3 documented exceptions |
| PlaybackBar | 1 file, 57 lines, 5 concerns interleaved | 5 files, each <40 lines, single responsibility |
| Component directory | 7 files in `components/` flat | 11 files in `components/` organized by feature (playback/ has sub-dir) |
| Button styling | CSS classes `menu-btn`, `ctrl-btn` | Mantine `Button` / `ActionIcon` with inline props |
| Icon system | Emoji characters in strings | Tabler icon components |
| Accessibility | Native elements (no ARIA) | Mantine built-in focus/aria/role |
| Extensibility | Add components ad-hoc | Documented patterns for graph tabs, annotation overlays |

**Total new files:** 7 (`theme.ts`, `playback/index.ts`, `PlaybackBar.tsx`, `PlaybackControls.tsx`, `TimelineSlider.tsx`, `PlaybackOptions.tsx`, `SpeedSelector.tsx`)

**Files deleted:** 1 (`styles.css`)

**Files modified:** 10 (`main.tsx`, `App.tsx`, `MenuBar.tsx`, `BoutInspector.tsx`, `BoutsPanel.tsx`, `BoutTimeline.tsx`, `DataGraphPaneECharts.tsx`, `VideoPane.tsx`, `ErrorBoundary.tsx`, `store.ts`)
