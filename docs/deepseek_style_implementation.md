# Mantine UI Redesign — Implementation Specification

## Overview

This document specifies the beautification and modularization of **behavysis-viewer** using [Mantine v7](https://mantine.dev/). The goal is to:

1. Replace all hardcoded inline `style` props with Mantine's first-class styling API (`style` / `styles` / `classNames` props, theme-aware `Box`/`Group`/`Stack` layout primitives).
2. Modularize the monolithic `PlaybackBar` into composable, single-responsibility sub-components.
3. Establish a centralised theme that maps the existing dark colour palette to Mantine design tokens.
4. Set up infrastructure so the app is extensible — future graph tabs, annotation overlays, etc. slot in cleanly.

---

## 1. Current State Audit

### 1.1 Style Approach

| Concern | Current |
|---|---|
| CSS framework | **None** — a 53-line `styles.css` with CSS variables that are never used by components |
| Component styling | Inline `style` props with hardcoded hex values on every element |
| Button styling | CSS classes `menu-btn` and `ctrl-btn` defined in `styles.css` |
| Range input | Global `accent-color: #60a5fa` via CSS |
| Spacing / layout | Manual `display: flex`, `gap`, `padding` inline on every container |
| Canvas rendering | Hardcoded hex colours in `BoutTimeline.tsx` and `VideoPane.tsx` |
| ECharts styling | Hardcoded hex colours in `DataGraphPaneECharts.tsx` option objects |

### 1.2 Colour Palette (Current)

| Role | Hex | Usage |
|---|---|---|
| Primary background | `#0f172a` | App root, BoutsPanel, body |
| Panel background | `#1e293b` | PlaybackBar, MenuBar |
| Input background | `#334155` | Select dropdown, menu-btn bg |
| Border / hover | `#475569` | Separators, hover states, axis lines |
| Muted text | `#64748b` | Status, frame info |
| Dim text | `#94a3b8` | Labels, timeline labels |
| Primary text | `#e2e8f0` | App root, buttons, panel text |
| Chart background | `#1a1a2e` | BoutTimeline canvas, ECharts, DataGraphPane |
| Accent blue | `#60a5fa` | Range slider, ECharts mark line, timeline marker |
| Selection highlight | `#1e3a5f` | Selected bout row |
| Green (IS) | `#22c55e` | Actual=1 |
| Red (NOT) | `#ef4444` | Actual=0 |
| Yellow (Unsure) | `#eab308` | Actual=-1 |

### 1.3 Component Inventory

| Component | Lines | Styling method |
|---|---|---|
| `App.tsx` | 105 | Inline `style` props on 6 divs |
| `PlaybackBar.tsx` | 57 | Inline `style` props + `ctrl-btn` CSS class |
| `MenuBar.tsx` | 20 | Inline `style` props + `menu-btn` CSS class |
| `BoutInspector.tsx` | 83 | Inline `style` props + native fieldset/legend |
| `BoutsPanel.tsx` | 78 | Inline `style` props on every row |
| `BoutTimeline.tsx` | 134 | Canvas API with hardcoded hex colours |
| `VideoPane.tsx` | 135 | Inline `style` props + canvas overlay |
| `DataGraphPaneECharts.tsx` | 119 | ECharts options with hardcoded hex colours |
| `ErrorBoundary.tsx` | 32 | Inline `style` props |

---

## 2. Dependencies

### 2.1 Install

```bash
pnpm add @mantine/core @mantine/hooks @tabler/icons-react
pnpm add -D postcss postcss-preset-mantine postcss-simple-vars
```

| Package | Purpose |
|---|---|
| `@mantine/core` | Component library, theme provider, style engine |
| `@mantine/hooks` | Utility hooks (`useDisclosure`, `useHover`, etc.) |
| `@tabler/icons-react` | Icon set for play/pause/skip controls |
| `postcss-preset-mantine` | Required PostCSS plugin for Mantine CSS compilation |
| `postcss-simple-vars` | Enables `$mantine-breakpoint-*` CSS variables |

### 2.2 PostCSS Config

Create `postcss.config.cjs` at project root:

```js
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
}
```

No changes needed to `electron.vite.config.ts` — PostCSS is picked up automatically by Vite.

---

## 3. Theme Architecture

### 3.1 Directory Structure

```
src/renderer/src/
├── theme/
│   ├── index.ts              # Theme creation + MantineProvider wrapper
│   ├── colors.ts             # Colour palette → Mantine colors tuple
│   └── components.ts         # Per-component defaultProps + styles overrides
├── components/
│   ├── playback/
│   │   ├── PlaybackBar.tsx       # Container (Group layout)
│   │   ├── PlaybackControls.tsx  # Play/Pause + skip buttons
│   │   ├── TimelineSlider.tsx    # Frame scrub slider
│   │   ├── PlaybackOptions.tsx   # Keypoints + Focus toggles
│   │   ├── SpeedSelector.tsx     # Playback speed dropdown
│   │   └── index.ts
│   ├── layout/
│   │   ├── MenuBar.tsx
│   │   └── index.ts
│   ├── data/
│   │   ├── BoutInspector.tsx
│   │   ├── BoutsPanel.tsx
│   │   ├── BoutTimeline.tsx      # (canvas refactor only — useMantineTheme)
│   │   └── DataGraphPaneECharts.tsx # (useMantineTheme for colours)
│   ├── video/
│   │   └── VideoPane.tsx         # (useMantineTheme for canvas colours)
│   ├── ErrorBoundary.tsx
│   └── App.tsx
```

### 3.2 Theme Configuration (`theme/index.ts`)

```ts
import { createTheme, MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { colors } from './colors'
import { components } from './components'

export const theme = createTheme({
  defaultColorScheme: 'dark',
  colors,
  primaryColor: 'blue',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: 'monospace',
  components,
  // Match existing compact spacing
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
  defaultRadius: 'sm',  // 4px — matches current border-radius usage
})
```

### 3.3 Colour Palette (`theme/colors.ts`)

Map existing hex values into Mantine's 10-shade tuple format where shade 0 = lightest, shade 9 = darkest:

```ts
import { MantineColorsTuple } from '@mantine/core'

// Dark theme — maps existing slate palette to Mantine's dark colour scale.
// Shade order: lightest → darkest (0 is text-on-dark, 9 is deepest bg).
const dark: MantineColorsTuple = [
  '#e2e8f0', // 0  ← text-primary
  '#cbd5e1', // 1
  '#94a3b8', // 2  ← text-dim (labels)
  '#64748b', // 3  ← text-muted (status)
  '#475569', // 4  ← border-hover, axis lines
  '#334155', // 5  ← border, input-bg
  '#1e293b', // 6  ← panel-bg (PlaybackBar, MenuBar)
  '#0f172a', // 7  ← primary-bg (App root, BoutsPanel)
  '#020617', // 8
  '#000000', // 9
]

// Blue accent — maps the existing #60a5fa as the primary (shade 4).
const blue: MantineColorsTuple = [
  '#eff6ff', // 0
  '#dbeafe', // 1
  '#bfdbfe', // 2
  '#93c5fd', // 3
  '#60a5fa', // 4  ← matches current accent
  '#3b82f6', // 5
  '#2563eb', // 6
  '#1d4ed8', // 7
  '#1e40af', // 8
  '#1e3a8a', // 9
]

export const colors = { dark, blue }
```

### 3.4 Component Overrides (`theme/components.ts`)

Set global defaults so every component instance picks up the right variant/size/colour without per-instance props:

```ts
import { Button, ActionIcon, Slider, Checkbox, Select, Switch, Badge, Paper, Group } from '@mantine/core'

export const components = {
  Button: Button.extend({
    defaultProps: { variant: 'subtle', color: 'gray', size: 'xs' },
  }),
  ActionIcon: ActionIcon.extend({
    defaultProps: { variant: 'subtle', color: 'gray', size: 'md' },
  }),
  Slider: Slider.extend({
    defaultProps: { color: 'blue.4', size: 'sm' },
  }),
  Checkbox: Checkbox.extend({
    defaultProps: { color: 'blue', size: 'xs' },
  }),
  Switch: Switch.extend({
    defaultProps: { color: 'blue', size: 'xs' },
  }),
  Select: Select.extend({
    defaultProps: { size: 'xs', variant: 'filled' },
  }),
  Badge: Badge.extend({
    defaultProps: { size: 'sm', variant: 'light' },
  }),
}
```

### 3.5 App Entry Point (`main.tsx` changes)

**Before:**
```tsx
import './styles.css'
ReactDOM.createRoot(...).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
```

**After:**
```tsx
import '@mantine/core/styles.css'
import { MantineProvider } from '@mantine/core'
import { theme } from './theme'

ReactDOM.createRoot(...).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </MantineProvider>
  </StrictMode>
)
```

Remove the `import './styles.css'` line — Mantine's `@mantine/core/styles.css` provides CSS reset + dark colour scheme + range input styling. The old `styles.css` can be deleted entirely.

---

## 4. PlaybackBar Module — Component Specifications

### 4.1 Architecture

The current 57-line monolithic component is decomposed into 5 sub-components, each with single responsibility:

```
PlaybackBar
├── PlaybackControls    ← play/pause + skip back + skip forward
├── TimelineSlider      ← full-width frame scrubber
├── TimeDisplay         ← seconds readout (inline text badge)
├── SpeedSelector       ← playback rate dropdown
└── PlaybackOptions     ← Keypoints toggle + Focus toggle
```

### 4.2 PlaybackBar Container

**File:** `components/playback/PlaybackBar.tsx`

```tsx
import { Group, Box, Text } from '@mantine/core'
import { PlaybackControls } from './PlaybackControls'
import { TimelineSlider } from './TimelineSlider'
import { PlaybackOptions } from './PlaybackOptions'
import { SpeedSelector } from './SpeedSelector'
import { useStore } from '../../store'

export function PlaybackBar() {
  const { currentFrame, config } = useStore()
  const fps = config?.fps ?? 15
  const seconds = Math.round(currentFrame / fps)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`

  return (
    <Group
      gap="xs"
      px="xs"
      py={4}
      style={{ background: 'var(--mantine-color-dark-6)', flexShrink: 0 }}
      wrap="nowrap"
      align="center"
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

### 4.3 PlaybackControls

**File:** `components/playback/PlaybackControls.tsx`

Replaces emoji buttons (▶/⏸, ◀ 5s, 5s ▶) with proper Tabler icons.

```tsx
import { Group, ActionIcon } from '@mantine/core'
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
} from '@tabler/icons-react'
import { useStore } from '../../store'
import { JUMP_FRAMES } from '../../constants'

export function PlaybackControls() {
  const { currentFrame, isPlaying, numFrames, config, setIsPlaying, panToFrame } = useStore()
  const fps = config?.fps ?? 15

  return (
    <Group gap={4}>
      <ActionIcon onClick={() => panToFrame(Math.max(0, currentFrame - JUMP_FRAMES(fps)))}>
        <IconPlayerSkipBackFilled size={18} />
      </ActionIcon>

      <ActionIcon
        color="blue"
        variant="filled"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying
          ? <IconPlayerPauseFilled size={18} />
          : <IconPlayerPlayFilled size={18} />
        }
      </ActionIcon>

      <ActionIcon onClick={() => panToFrame(Math.min(numFrames - 1, currentFrame + JUMP_FRAMES(fps)))}>
        <IconPlayerSkipForwardFilled size={18} />
      </ActionIcon>
    </Group>
  )
}
```

**Design decision:** The play/pause button uses `variant="filled" color="blue"` so it stands out as the primary action. Skip buttons are `variant="subtle"` (inherited from theme defaults).

### 4.4 TimelineSlider

**File:** `components/playback/TimelineSlider.tsx`

```tsx
import { Slider } from '@mantine/core'
import { useStore } from '../../store'

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
    />
  )
}
```

**Note:** `label={null}` suppresses the tooltip on drag (important for performance with large frame counts).

### 4.5 PlaybackOptions

**File:** `components/playback/PlaybackOptions.tsx`

Replaces checkbox+label combos with Mantine `Switch` for a cleaner toggle UI.

```tsx
import { Group, Switch } from '@mantine/core'
import { useStore } from '../../store'

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

### 4.6 SpeedSelector

**File:** `components/playback/SpeedSelector.tsx`

```tsx
import { Select } from '@mantine/core'
import { useStore } from '../../store'

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

### 4.7 Barrel Export

**File:** `components/playback/index.ts`

```ts
export { PlaybackBar } from './PlaybackBar'
```

---

## 5. Component Migrations — File-by-File

### 5.1 App.tsx

**Changes:**
- Replace `<div>` wrappers with Mantine `<Box>` + `<Group>` / `<Stack>`
- Use `bg` prop instead of `style={{ background: '#0f172a' }}`
- Use `c` (color) prop instead of `style={{ color: '#e2e8f0' }}`

```tsx
import { Box, Group } from '@mantine/core'
import { Group as PanelGroup, Panel, Separator } from 'react-resizable-panels'
// ... component imports unchanged

export default function App() {
  // ... hooks unchanged

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100vh' }} bg="dark.7" c="dark.0">
      <MenuBar onOpen={open} onSave={save} onSaveJson={saveJson} status={status} />

      <PanelGroup orientation="horizontal" style={{ flex: 1, overflow: 'hidden' }}>
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
              style={{ flexShrink: 0, minHeight: 140 }}
              bg="dark.7"
              style={(theme) => ({ borderTop: '1px solid var(--mantine-color-dark-6)' })}
            >
              <BoutInspector />
            </Box>
          </Box>
        </Panel>
      </PanelGroup>
    </Box>
  )
}
```

### 5.2 MenuBar.tsx

Replace `<button className="menu-btn">` with Mantine `Button variant="subtle"`.

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

### 5.3 BoutInspector.tsx

Replace `fieldset`/`legend` with Mantine `Paper` + `Radio.Group` + `Checkbox.Group`.

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
    return (
      <Text c="dark.4" size="xs" p="sm">
        Select a bout to inspect
      </Text>
    )
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

### 5.4 BoutsPanel.tsx

Replace inline row styling with Mantine props.

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

### 5.5 BoutTimeline.tsx (Canvas — theme integration only)

This component renders on `<canvas>` so can't use Mantine JSX components directly. Instead, access theme values via `useMantineTheme()` hook:

```tsx
import { useRef, useEffect, useCallback } from 'react'
import { useMantineTheme } from '@mantine/core'
import { useStore } from '../store'
import { ACTUAL_COLORS } from '../types'

interface Props {
  height?: number
}

const ROW_HEIGHT = 24
const LABEL_WIDTH = 80

export function BoutTimeline({ height = 120 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const theme = useMantineTheme()

  const { bouts, currentFrame, visibleRange, config, selectBout, selectedBoutId } = useStore()
  const fps = config?.fps ?? 15

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !container) return

    const width = container.clientWidth
    canvas.width = width
    canvas.height = height

    // Dark chart background (kept as #1a1a2e for contrast against panels)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const [xMin, xMax] = visibleRange
    const frameRange = xMax - xMin
    const plotWidth = canvas.width - LABEL_WIDTH
    const frameToX = (f: number) => LABEL_WIDTH + ((f - xMin) / frameRange) * plotWidth

    const behavSet = new Set(bouts.map((b) => b.behav))
    const behavNames = [...behavSet]
    const rowCount = Math.max(behavNames.length, 1)
    const rowH = Math.min(ROW_HEIGHT, (canvas.height - 4) / rowCount)

    ctx.font = '11px monospace'

    behavNames.forEach((behav, rowIdx) => {
      const y = 2 + rowIdx * rowH
      ctx.fillStyle = theme.colors.dark[2]  // #94a3b8
      ctx.fillText(behav, 4, y + rowH * 0.65)

      for (const bout of bouts) {
        if (bout.behav !== behav) continue
        if (bout.stop < xMin || bout.start > xMax) continue

        const x0 = Math.max(frameToX(bout.start), LABEL_WIDTH)
        const x1 = Math.min(frameToX(bout.stop + 1), canvas.width)
        if (x1 <= x0) continue

        ctx.fillStyle = ACTUAL_COLORS[bout.actual]
        ctx.globalAlpha = bout.id === selectedBoutId ? 1 : 0.75
        ctx.fillRect(x0, y + 2, x1 - x0, rowH - 4)
        ctx.globalAlpha = 1

        if (bout.id === selectedBoutId) {
          ctx.strokeStyle = theme.white
          ctx.lineWidth = 1.5
          ctx.strokeRect(x0, y + 2, x1 - x0, rowH - 4)
        }
      }
    })

    // Time marker
    const markerX = frameToX(currentFrame)
    ctx.strokeStyle = theme.colors.blue[4]  // #60a5fa
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(markerX, 0)
    ctx.lineTo(markerX, canvas.height)
    ctx.stroke()
  }, [bouts, currentFrame, visibleRange, selectedBoutId, config, height, theme])

  useEffect(() => { draw() }, [draw])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // ... (logic unchanged from current implementation)
    },
    [bouts, visibleRange, selectBout],
  )

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        height={height}
        onClick={handleClick}
        style={{ display: 'block', cursor: 'pointer', background: '#1a1a2e', width: '100%' }}
      />
    </div>
  )
}
```

### 5.6 DataGraphPaneECharts.tsx (ECharts theme integration)

Replace hardcoded ECharts option colours with values from `useMantineTheme()`:

```tsx
import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'
import { useMantineTheme } from '@mantine/core'
import { useStore } from '../store'
import type { GraphSeries } from '../types'

interface Props {
  series: GraphSeries
  height?: number
}

export function DataGraphPaneECharts({ series, height = 80 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const theme = useMantineTheme()

  const { currentFrame, visibleRange, config } = useStore()
  const fps = config?.fps ?? 15

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const chart = echarts.init(node, undefined, { width: node.clientWidth, height })
    chartRef.current = chart
    const ro = new ResizeObserver(() => {
      const w = containerRef.current?.clientWidth
      if (w) chart.resize({ width: w, height })
    })
    ro.observe(node)
    return () => { ro.disconnect(); chart.dispose(); chartRef.current = null }
  }, [height])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const n = series.values.length
    const xMin = visibleRange[0] / fps
    const xMax = visibleRange[1] / fps
    const markerX = currentFrame / fps
    const data: [number, number][] = []
    for (let i = 0; i < n; i++) data.push([i / fps, series.values[i]])

    chart.setOption({
      grid: { top: 4, right: 8, bottom: 24, left: 48 },
      xAxis: {
        type: 'value', min: xMin, max: xMax,
        interval: (xMax - xMin) / 4,
        axisLine: { lineStyle: { color: theme.colors.dark[4] } },
        axisTick: { lineStyle: { color: theme.colors.dark[4] } },
        axisLabel: { margin: 6, fontSize: 11, color: theme.colors.dark[2], formatter: (v: number) => `${v.toFixed(1)}s` },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: theme.colors.dark[4] } },
        axisLabel: { fontSize: 9, color: theme.colors.dark[3] },
        splitLine: { lineStyle: { color: theme.colors.dark[5], width: 0.5 } },
      },
      series: [{
        type: 'line', data, smooth: true, showSymbol: false,
        lineStyle: { color: series.color, width: 1.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: series.color + '44' },
            { offset: 1, color: series.color + '00' },
          ]),
        },
        markLine: {
          silent: true, symbol: ['none', 'none'], label: { show: false },
          lineStyle: { color: theme.colors.blue[4], width: 2 },
          data: [{ xAxis: markerX }],
        },
      }],
      backgroundColor: '#1a1a2e',
      animation: false,
    }, { notMerge: true })
  }, [series.values, fps, visibleRange, currentFrame, theme])

  return (
    <Box bg="#1a1a2e" style={{ flexShrink: 0 }}>
      <Text size="xs" c="dark.2" px="xs" py={2}>{series.label}</Text>
      <div ref={containerRef} style={{ width: '100%', height: `${height}px` }} />
    </Box>
  )
}
```

### 5.7 VideoPane.tsx

Keep the core video+canvas logic unchanged. Use `Box` for the container and accept theme colours via `useMantineTheme()` for any canvas drawing that references fixed colours (keypoint overlay already uses per-individual colours from `keypointDefs`, so minimal change needed here).

```tsx
// Only the render section changes:
return (
  <Box pos="relative" w="100%" style={{ aspectRatio: `${vidDims.w} / ${vidDims.h}`, background: '#111' }}>
    <video
      ref={videoRef}
      src={videoUrl ?? undefined}
      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
      onLoadedMetadata={() => {
        const v = videoRef.current
        if (v) setVidDims({ w: v.videoWidth, h: v.videoHeight })
      }}
      onEnded={() => setIsPlaying(false)}
    />
    <canvas
      ref={canvasRef}
      width={vidDims.w}
      height={vidDims.h}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  </Box>
)
```

### 5.8 ErrorBoundary.tsx

```tsx
import { Component, type ReactNode } from 'react'
import { Alert, Code } from '@mantine/core'

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <Alert color="red" title="Something went wrong" variant="light" m="md">
          <Code block style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</Code>
        </Alert>
      )
    }
    return this.props.children
  }
}
```

---

## 6. Store Extensibility (Future)

Add the following to `store.ts` for future graph tabs and annotation features. Keep commented until needed, but define the types now so the architecture is ready.

```ts
// In AppState interface — future additions:

// ── Graph tabs (future) ──────────────────────────────────────────────────
graphTabDefs: { id: string; label: string; seriesIds: string[] }[]
activeGraphTab: string | null
setActiveGraphTab: (tab: string | null) => void

// ── Annotations (future) ─────────────────────────────────────────────────
annotationMode: 'none' | 'point' | 'rectangle' | 'polygon'
setAnnotationMode: (mode: AppState['annotationMode']) => void
```

The `TabPanel` component (see §7.2) will consume `graphTabDefs` and `activeGraphTab` from the store when ready. API remains clean regardless of when implementation happens.

---

## 7. Extensibility Infrastructure

### 7.1 Graph Tabs (Future)

```tsx
// components/data/GraphTabs.tsx
import { Tabs } from '@mantine/core'
import { DataGraphPaneECharts as DataGraphPane } from './DataGraphPaneECharts'
import { useStore } from '../../store'

export function GraphTabs() {
  const { graphTabDefs, activeGraphTab, setActiveGraphTab, graphSeries } = useStore()

  if (graphTabDefs.length === 0) return null

  return (
    <Tabs value={activeGraphTab} onChange={setActiveGraphTab} variant="pills">
      <Tabs.List>
        {graphTabDefs.map(def => (
          <Tabs.Tab key={def.id} value={def.id}>{def.label}</Tabs.Tab>
        ))}
      </Tabs.List>
      {graphTabDefs.map(def => {
        const seriesForTab = graphSeries.filter(s => def.seriesIds.includes(s.label))
        return (
          <Tabs.Panel key={def.id} value={def.id}>
            {seriesForTab.map(s => (
              <DataGraphPane key={s.label} series={s} height={100} />
            ))}
          </Tabs.Panel>
        )
      })}
    </Tabs>
  )
}
```

Slot into `App.tsx` where the current `graphSeries.map(...)` loop is:
```tsx
<GraphTabs />
```

### 7.2 Annotation Overlay on Video (Future)

```tsx
// components/video/AnnotationControls.tsx
import { Group, ActionIcon, Box } from '@mantine/core'
import { IconPointer, IconRectangle, IconPolygon } from '@tabler/icons-react'
import { useStore } from '../../store'

export function AnnotationControls() {
  const { annotationMode, setAnnotationMode } = useStore()

  return (
    <Box pos="absolute" top={8} right={8} style={{ zIndex: 10 }}>
      <Group gap={4}>
        <ActionIcon
          variant={annotationMode === 'point' ? 'filled' : 'subtle'}
          color="blue"
          onClick={() => setAnnotationMode(annotationMode === 'point' ? 'none' : 'point')}
        >
          <IconPointer size={16} />
        </ActionIcon>
        <ActionIcon
          variant={annotationMode === 'rectangle' ? 'filled' : 'subtle'}
          color="blue"
          onClick={() => setAnnotationMode(annotationMode === 'rectangle' ? 'none' : 'rectangle')}
        >
          <IconRectangle size={16} />
        </ActionIcon>
      </Group>
    </Box>
  )
}
```

Slot into `VideoPane.tsx`:
```tsx
<Box pos="relative" ...>
  <video ... />
  <canvas ... />
  <AnnotationControls />
</Box>
```

---

## 8. Migration Order

Execute in this sequence to minimise breakage:

| Step | What | Risk | Rollback |
|---|---|---|---|
| 1 | `pnpm add` Mantine dependencies | Low | `pnpm remove` |
| 2 | Create `postcss.config.cjs` | Low | Delete file |
| 3 | Create `theme/` directory + files | Low — not wired yet | Delete directory |
| 4 | Update `main.tsx` to wrap `MantineProvider` | **Medium** — Mantine resets will change global look | Remove `MantineProvider` from `main.tsx` |
| 5 | **Verify app loads** with MantineProvider (no component changes) | — | — |
| 6 | Modularize `PlaybackBar` → create `components/playback/*` and wire into `App.tsx` | Medium — playback is core UX | Restore original `PlaybackBar.tsx` |
| 7 | Migrate `MenuBar.tsx` | Low | Revert file |
| 8 | Migrate `App.tsx` layout (Box/Group wrappers) | Medium — layout | Revert file |
| 9 | Migrate `BoutInspector.tsx` | Low — scoring workflow | Revert file |
| 10 | Migrate `BoutsPanel.tsx` | Low | Revert file |
| 11 | Migrate `ErrorBoundary.tsx` | Low | Revert file |
| 12 | Update `BoutTimeline.tsx` to use `useMantineTheme()` | Low — canvas colours only | Revert file |
| 13 | Update `DataGraphPaneECharts.tsx` to use `useMantineTheme()` | Low — ECharts colours only | Revert file |
| 14 | Update `VideoPane.tsx` container to `Box` | Low | Revert file |
| 15 | Delete `styles.css` (no longer needed) | Low | Restore from git |

---

## 9. Testing Checklist

After migration, verify interactively:

- [ ] App loads without console errors
- [ ] Dark theme renders — all backgrounds, text, borders match the dark palette
- [ ] Play/Pause button toggles with proper icon swap
- [ ] Skip back 5s / Skip forward 5s work
- [ ] Timeline slider scrubs correctly (drag + release)
- [ ] Speed selector (0.25x–2x) changes playback rate
- [ ] Keypoints toggle shows/hides keypoint overlay
- [ ] Focus toggle pauses at end of selected bout
- [ ] Time display updates correctly in HH:MM:SS or M:SS format
- [ ] MenuBar: Open / Save / Save bouts JSON work
- [ ] Bout list: scrolling is smooth, rows highlight on selection
- [ ] Bout timeline: canvas renders, clicking selects bout
- [ ] Bout inspector: scoring radio buttons + sub-behaviour checkboxes work
- [ ] Data graph panes render with correct colours
- [ ] Resizable panels still drag correctly
- [ ] Keyboard shortcuts still work
- [ ] `pnpm build` completes without errors

---

## 10. Design Decisions Log

| Decision | Rationale |
|---|---|
| `componentProps` over `createStyles` | Mantine v7 encourages theme-level `extend()` for defaults; `createStyles` is for one-off component-specific styles not covered by props |
| `Switch` instead of `Checkbox` for Keypoints/Focus | `Switch` is the idiomatic control for feature toggles; `Checkbox` is for form selection lists |
| `Button variant="subtle"` for menu buttons | Matches the compact, low-visual-weight style of the current `menu-btn` class while gaining hover/focus accessibility |
| `ActionIcon variant="filled" color="blue"` for Play/Pause | Visually distinguishes the primary transport control from skip buttons |
| Keep `#1a1a2e` for chart backgrounds | The slightly different hue distinguishes data visualisation areas from UI panels. Mantine's dark scale doesn't have an exact match, so this is a deliberate exception. |
| `useMantineTheme()` for canvas/ECharts | Canvas-based and ECharts rendering can't use JSX props, so the theme hook exposes colour values in JavaScript |
| Keep `react-resizable-panels` | Mantine does not provide a resizable split panel component. The existing `react-resizable-panels` integration works well and sits alongside Mantine layout primitives. |

---

## 11. File Manifest

After full migration, the component tree will be:

```
src/renderer/src/
├── main.tsx                        ← +MantineProvider, -styles.css import
├── theme/
│   ├── index.ts                    ★ NEW
│   ├── colors.ts                   ★ NEW
│   └── components.ts               ★ NEW
├── constants.ts                    (unchanged)
├── store.ts                        (+future annotations/graphTab placeholders)
├── types.ts                        (unchanged)
├── styles.css                      ★ DELETED (replaced by @mantine/core/styles.css)
├── components/
│   ├── App.tsx                     ♻ REWRITTEN (Mantine layout primitives)
│   ├── ErrorBoundary.tsx           ♻ REWRITTEN (Alert + Code)
│   ├── playback/
│   │   ├── index.ts                ★ NEW
│   │   ├── PlaybackBar.tsx         ★ NEW (was monolithic, now container)
│   │   ├── PlaybackControls.tsx    ★ NEW (extracted from PlaybackBar)
│   │   ├── TimelineSlider.tsx      ★ NEW (extracted from PlaybackBar)
│   │   ├── PlaybackOptions.tsx     ★ NEW (extracted from PlaybackBar)
│   │   └── SpeedSelector.tsx       ★ NEW (extracted from PlaybackBar)
│   ├── layout/
│   │   ├── index.ts                ★ NEW
│   │   └── MenuBar.tsx             ♻ REWRITTEN (Mantine Button)
│   ├── data/
│   │   ├── BoutInspector.tsx       ♻ REWRITTEN (Paper, Radio.Group, Checkbox)
│   │   ├── BoutsPanel.tsx          ♻ REWRITTEN (Mantine Box + Text)
│   │   ├── BoutTimeline.tsx        ♻ theme hook integration only
│   │   └── DataGraphPaneECharts.tsx ♻ theme hook integration only
│   └── video/
│       └── VideoPane.tsx           ♻ Box container only
```

**Legend:** ★ NEW = new file, ♻ = rewritten/modified, ★ DELETED = removed

---

## 12. Appendix: Mantine Style API Quick Reference

Developers working with these components should use these patterns instead of inline `style` props:

| Pattern | Example | Equivalent to old |
|---|---|---|
| Background | `bg="dark.7"` | `style={{ background: '#0f172a' }}` |
| Text colour | `c="dark.0"` | `style={{ color: '#e2e8f0' }}` |
| Dimmed text | `c="dimmed"` | `style={{ color: '#64748b' }}` |
| Spacing | `p="xs"`, `px="sm"`, `gap="md"` | `style={{ padding: 4 }}` etc. |
| Font size | `size="xs"` | `style={{ fontSize: 11 }}` |
| Font family | `ff="monospace"` | `style={{ fontFamily: 'monospace' }}` |
| Flex layout | `<Group>` / `<Stack>` | `style={{ display: 'flex', flexDirection: '...' }}` |
| Full-height fill | `h="100%"` | `style={{ height: '100%' }}` |
| Border | `withBorder` on `Paper` | `style={{ border: '1px solid ...' }}` |
| Per-element override | `styles={{ root: {...}, input: {...} }}` | Inline styles on individual parts |
