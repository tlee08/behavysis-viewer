# Mantine UI Redesign Implementation Specification

## Overview

This document specifies the complete redesign of behavysis-viewer using Mantine UI library. The goal is to create a modular, extensible component architecture with standardized styling that supports future features like annotation overlays and additional graph tabs.

---

## 1. Dependencies

### 1.1 Install Packages

```bash
npm install @mantine/core @mantine/hooks @tabler/icons-react
```

| Package | Purpose |
|---------|---------|
| `@mantine/core` | Core UI components |
| `@mantine/hooks` | Utility hooks (useHover, useClickOutside, etc.) |
| `@tabler/icons-react` | Icon library (play, pause, skip, etc.) |

### 1.2 Update Vite Config

The current Vite config (`electron.vite.config.ts`) should work without changes. Mantine is compatible with Vite out of the box.

---

## 2. Theme Architecture

### 2.1 Directory Structure

```
src/renderer/src/
├── theme/
│   ├── index.ts           # Theme exports
│   ├── colors.ts           # Color palette mapping
│   ├── components.ts       # Mantine component overrides
│   └── types.ts            # TypeScript theme extensions
├── components/
│   ├── ui/                 # Reusable Mantine wrappers
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── IconButton.tsx
│   │   │   └── index.ts
│   │   ├── Slider/
│   │   │   ├── Slider.tsx
│   │   │   └── index.ts
│   │   ├── Toggle/
│   │   │   ├── Toggle.tsx
│   │   │   ├── ToggleGroup.tsx
│   │   │   └── index.ts
│   │   ├── Checkbox/
│   │   │   ├── Checkbox.tsx
│   │   │   └── index.ts
│   │   ├── Select/
│   │   │   ├── Select.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── playback/
│   │   ├── PlaybackBar/
│   │   │   ├── PlaybackBar.tsx
│   │   │   ├── PlaybackBar.styles.ts
│   │   │   └── index.ts
│   │   ├── PlaybackControls/
│   │   │   ├── PlaybackControls.tsx
│   │   │   └── index.ts
│   │   ├── TimelineSlider/
│   │   │   ├── TimelineSlider.tsx
│   │   │   ├── TimelineSlider.styles.ts
│   │   │   └── index.ts
│   │   ├── PlaybackOptions/
│   │   │   ├── PlaybackOptions.tsx
│   │   │   └── index.ts
│   │   ├── SpeedSelector/
│   │   │   ├── SpeedSelector.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── video/
│   │   ├── VideoPane/
│   │   │   ├── VideoPane.tsx
│   │   │   ├── VideoPane.styles.ts
│   │   │   └── index.ts
│   │   ├── KeypointsOverlay/
│   │   │   ├── KeypointsOverlay.tsx
│   │   │   └── index.ts
│   │   └── AnnotationOverlay/
│   │       ├── AnnotationOverlay.tsx      # Future: video annotations
│   │       ├── AnnotationOverlay.types.ts
│   │       └── index.ts
│   ├── data/
│   │   ├── BoutTimeline/
│   │   │   ├── BoutTimeline.tsx
│   │   │   ├── BoutTimelineCanvas.tsx
│   │   │   ├── BoutTimeline.styles.ts
│   │   │   └── index.ts
│   │   ├── BoutsPanel/
│   │   │   ├── BoutsPanel.tsx
│   │   │   ├── BoutRow.tsx
│   │   │   ├── BoutsPanel.styles.ts
│   │   │   └── index.ts
│   │   ├── BoutInspector/
│   │   │   ├── BoutInspector.tsx
│   │   │   ├── BoutInspector.styles.ts
│   │   │   └── index.ts
│   │   ├── DataGraphPane/
│   │   │   ├── DataGraphPane.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── layout/
│   │   ├── MenuBar/
│   │   │   ├── MenuBar.tsx
│   │   │   ├── MenuBar.styles.ts
│   │   │   └── index.ts
│   │   ├── AppLayout/
│   │   │   ├── AppLayout.tsx
│   │   │   └── index.ts
│   │   ├── TabPanel/
│   │   │   ├── TabPanel.tsx           # Future: graph/annotation tabs
│   │   │   ├── TabPanel.types.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── App.tsx
└── styles/
    └── global.css
```

---

## 3. Theme Configuration

### 3.1 Color Palette (`theme/colors.ts`)

```typescript
// theme/colors.ts
import { MantineColorsTuple } from '@mantine/core';

// Your existing color palette
export const palette = {
  bg: {
    primary: '#0f172a',
    panel: '#1e293b',
    input: '#334155',
    hover: '#475569',
    active: '#1e3a5f',
  },
  text: {
    primary: '#e2e8f0',
    muted: '#64748b',
    dim: '#94a3b8',
  },
  accent: {
    blue: '#60a5fa',
    marker: '#60a5fa',
  },
  border: '#334155',
} as const;

// Mantine color tuple for dark theme (10 shades)
const darkColors: MantineColorsTuple = [
  '#e2e8f0', // 0 - lightest
  '#cbd5e1', // 1
  '#94a3b8', // 2
  '#64748b', // 3
  '#475569', // 4
  '#334155', // 5
  '#1e293b', // 6
  '#0f172a', // 7 - primary dark
  '#020617', // 8
  '#000000', // 9 - darkest
];

const blueColors: MantineColorsTuple = [
  '#eff6ff',
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6',
  '#2563eb',
  '#1d4ed8',
  '#1e40af',
  '#1e3a8a',
];

export const colors = {
  dark: darkColors,
  blue: blueColors,
};
```

### 3.2 Component Overrides (`theme/components.ts`)

```typescript
// theme/components.ts
import { Button, Slider, Checkbox, Select, ActionIcon } from '@mantine/core';

export const components = {
  Button: Button.extend({
    defaultProps: {
      variant: 'subtle',
      color: 'gray',
      size: 'sm',
    },
    styles: {
      root: {
        fontWeight: 500,
      },
    },
  }),
  
  ActionIcon: ActionIcon.extend({
    defaultProps: {
      variant: 'subtle',
      color: 'gray',
      size: 'md',
    },
  }),
  
  Slider: Slider.extend({
    defaultProps: {
      color: 'blue',
      size: 'sm',
      label: null,
    },
    styles: {
      track: {
        backgroundColor: 'var(--mantine-color-dark-5)',
      },
      bar: {
        backgroundColor: 'var(--mantine-color-blue-5)',
      },
      thumb: {
        borderColor: 'var(--mantine-color-blue-4)',
      },
    },
  }),
  
  Checkbox: Checkbox.extend({
    defaultProps: {
      color: 'blue',
      size: 'xs',
    },
    styles: {
      label: {
        color: 'var(--mantine-color-gray-4)',
        fontSize: 'var(--mantine-font-size-xs)',
      },
    },
  }),
  
  Select: Select.extend({
    defaultProps: {
      size: 'xs',
      variant: 'filled',
    },
    styles: {
      input: {
        backgroundColor: 'var(--mantine-color-dark-5)',
        border: '1px solid var(--mantine-color-dark-4)',
      },
    },
  }),
};
```

### 3.3 Theme Index (`theme/index.ts`)

```typescript
// theme/index.ts
import { createTheme } from '@mantine/core';
import { colors } from './colors';
import { components } from './components';

export const theme = createTheme({
  defaultColorScheme: 'dark',
  colors,
  primaryColor: 'blue',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: 'monospace',
  components,
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  radius: {
    xs: '3px',
    sm: '4px',
    md: '6px',
  },
});

export { palette } from './colors';
```

---

## 4. UI Component Library

### 4.1 Button Component (`components/ui/Button/`)

```typescript
// components/ui/Button/Button.tsx
import { Button as MantineButton, ButtonProps } from '@mantine/core';

export interface ButtonProps extends MantineButtonProps {
  // Add custom props if needed
}

export function Button(props: ButtonProps) {
  return <MantineButton {...props} />;
}

// components/ui/Button/IconButton.tsx
import { ActionIcon, ActionIconProps } from '@mantine/core';
import { ReactNode } from 'react';

export interface IconButtonProps extends ActionIconProps {
  children: ReactNode;
}

export function IconButton({ children, ...props }: IconButtonProps) {
  return <ActionIcon {...props}>{children}</ActionIcon>;
}

// components/ui/Button/index.ts
export { Button } from './Button';
export { IconButton } from './IconButton';
export type { ButtonProps } from './Button';
export type { IconButtonProps } from './IconButton';
```

### 4.2 Slider Component (`components/ui/Slider/`)

```typescript
// components/ui/Slider/Slider.tsx
import { Slider as MantineSlider, SliderProps } from '@mantine/core';

export interface TimelineSliderProps extends Omit<SliderProps, 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function Slider({ value, onChange, min = 0, max = 100, ...props }: TimelineSliderProps) {
  return (
    <MantineSlider
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      {...props}
    />
  );
}
```

### 4.3 Toggle Component (`components/ui/Toggle/`)

```typescript
// components/ui/Toggle/Toggle.tsx
import { Switch, SwitchProps } from '@mantine/core';

export interface ToggleProps extends SwitchProps {
  label?: string;
}

export function Toggle({ label, ...props }: ToggleProps) {
  return <Switch label={label} {...props} />;
}
```

### 4.4 UI Index (`components/ui/index.ts`)

```typescript
// components/ui/index.ts
export { Button, IconButton } from './Button';
export { Slider } from './Slider';
export { Toggle } from './Toggle';
export { Checkbox } from './Checkbox';
export { Select } from './Select';
```

---

## 5. Playback Components

### 5.1 PlaybackBar (`components/playback/PlaybackBar/`)

**Layout:**
```
┌───────────────────────────────────────────────────────────────────────┐
│ [▶] [◀◀] [▶▶] ═══════════════●═══════════════════ 1:23 [0.5x ▾]       │
│                                              ▔▔▔▔▔▔▔                   │
│ [✓] Keypoints  [✓] Focus                                               │
└───────────────────────────────────────────────────────────────────────┘
```

**Props Interface:**
```typescript
// components/playback/PlaybackBar/PlaybackBar.tsx
export interface PlaybackBarProps {
  // All state comes from useStore
}
```

**Implementation:**
```typescript
// components/playback/PlaybackBar/PlaybackBar.tsx
import { Group, Box, Text } from '@mantine/core';
import { PlaybackControls } from '../PlaybackControls';
import { TimelineSlider } from '../TimelineSlider';
import { PlaybackOptions } from '../PlaybackOptions';
import { SpeedSelector } from '../SpeedSelector';
import { useStore } from '../../../store';
import { useStyles } from './PlaybackBar.styles';

export function PlaybackBar() {
  const { classes } = useStyles();
  const { currentFrame, config } = useStore();
  const fps = config?.fps ?? 15;
  
  return (
    <Box className={classes.root}>
      <Group gap="xs" align="center" wrap="nowrap">
        <PlaybackControls />
        
        <Box className={classes.sliderContainer}>
          <TimelineSlider />
        </Box>
        
        <Text className={classes.timecode} size="xs" ff="monospace">
          {formatTime(currentFrame, fps)}
        </Text>
        
        <SpeedSelector />
      </Group>
      
      <Group gap="md" align="center">
        <PlaybackOptions />
      </Group>
    </Box>
  );
}

function formatTime(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

**Styles (`PlaybackBar.styles.ts`):**
```typescript
// components/playback/PlaybackBar/PlaybackBar.styles.ts
import { createStyles } from '@mantine/core';

export const useStyles = createStyles((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.dark[6],
    borderTop: `1px solid ${theme.colors.dark[5]}`,
    gap: theme.spacing.sm,
    flexShrink: 0,
  },
  sliderContainer: {
    flex: 1,
    minWidth: 200,
  },
  timecode: {
    color: theme.colors.gray[5],
    minWidth: 40,
    textAlign: 'right',
  },
}));
```

### 5.2 PlaybackControls (`components/playback/PlaybackControls/`)

```typescript
// components/playback/PlaybackControls/PlaybackControls.tsx
import { Group } from '@mantine/core';
import { IconPlayerPlay, IconPlayerPause, IconPlayerSkipBack, IconPlayerSkipForward } from '@tabler/icons-react';
import { IconButton } from '../../ui';
import { useStore } from '../../../store';
import { JUMP_FRAMES } from '../../../constants';

export function PlaybackControls() {
  const { currentFrame, numFrames, isPlaying, setIsPlaying, panToFrame, config } = useStore();
  const fps = config?.fps ?? 15;
  
  const handleSkipBack = () => {
    panToFrame(Math.max(0, currentFrame - JUMP_FRAMES(fps)));
  };
  
  const handleSkipForward = () => {
    panToFrame(Math.min(numFrames - 1, currentFrame + JUMP_FRAMES(fps)));
  };
  
  return (
    <Group gap={4}>
      <IconButton
        onClick={() => setIsPlaying(!isPlaying)}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
      </IconButton>
      
      <IconButton onClick={handleSkipBack} aria-label="Skip back 5 seconds">
        <IconPlayerSkipBack size={18} />
      </IconButton>
      
      <IconButton onClick={handleSkipForward} aria-label="Skip forward 5 seconds">
        <IconPlayerSkipForward size={18} />
      </IconButton>
    </Group>
  );
}
```

### 5.3 TimelineSlider (`components/playback/TimelineSlider/`)

```typescript
// components/playback/TimelineSlider/TimelineSlider.tsx
import { Slider } from '@mantine/core';
import { useStore } from '../../../store';
import { useStyles } from './TimelineSlider.styles';

export function TimelineSlider() {
  const { classes } = useStyles();
  const { currentFrame, numFrames, panToFrame } = useStore();
  
  return (
    <Slider
      value={currentFrame}
      onChange={panToFrame}
      min={0}
      max={Math.max(numFrames - 1, 0)}
      step={1}
      className={classes.slider}
      classNames={{
        track: classes.track,
        bar: classes.bar,
        thumb: classes.thumb,
      }}
    />
  );
}
```

### 5.4 PlaybackOptions (`components/playback/PlaybackOptions/`)

```typescript
// components/playback/PlaybackOptions/PlaybackOptions.tsx
import { Group } from '@mantine/core';
import { Toggle } from '../../ui';
import { useStore } from '../../../store';

export function PlaybackOptions() {
  const { showKeypoints, setShowKeypoints, focusBout, setFocusBout } = useStore();
  
  return (
    <Group gap="sm">
      <Toggle
        label="Keypoints"
        checked={showKeypoints}
        onChange={(e) => setShowKeypoints(e.currentTarget.checked)}
      />
      <Toggle
        label="Focus"
        checked={focusBout}
        onChange={(e) => setFocusBout(e.currentTarget.checked)}
      />
    </Group>
  );
}
```

### 5.5 SpeedSelector (`components/playback/SpeedSelector/`)

```typescript
// components/playback/SpeedSelector/SpeedSelector.tsx
import { Select } from '@mantine/core';
import { useStore } from '../../../store';

const SPEED_OPTIONS = [
  { value: '0.25', label: '0.25x' },
  { value: '0.5', label: '0.5x' },
  { value: '1', label: '1x' },
  { value: '1.5', label: '1.5x' },
  { value: '2', label: '2x' },
];

export function SpeedSelector() {
  const { vidSpeed, setVidSpeed } = useStore();
  
  return (
    <Select
      data={SPEED_OPTIONS}
      value={vidSpeed.toString()}
      onChange={(value) => setVidSpeed(Number(value))}
      size="xs"
      w={70}
    />
  );
}
```

---

## 6. Layout Components

### 6.1 MenuBar (`components/layout/MenuBar/`)

```typescript
// components/layout/MenuBar/MenuBar.tsx
import { Group, Text, Badge, Button } from '@mantine/core';
import { useStyles } from './MenuBar.styles';

interface MenuBarProps {
  onOpen: () => void;
  onSave: () => void;
  onSaveJson: () => void;
  status: string;
}

export function MenuBar({ onOpen, onSave, onSaveJson, status }: MenuBarProps) {
  const { classes } = useStyles();
  
  return (
    <Group className={classes.root}>
      <Group gap="xs">
        <Button variant="subtle" size="xs" onClick={onOpen}>
          Open
        </Button>
        <Button variant="subtle" size="xs" onClick={onSave}>
          Save
        </Button>
        <Button variant="subtle" size="xs" onClick={onSaveJson}>
          Save bouts JSON
        </Button>
      </Group>
      
      <Text className={classes.status} size="xs" ff="monospace">
        {status}
      </Text>
    </Group>
  );
}
```

### 6.2 App Entry Point

```typescript
// src/renderer/src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { theme } from './theme';
import App from './App';
import './styles/global.css';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>
);
```

---

## 7. Data Components

### 7.1 BoutsPanel Redesign

```typescript
// components/data/BoutsPanel/BoutsPanel.tsx
import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Text } from '@mantine/core';
import { useStore } from '../../../store';
import { useStyles } from './BoutsPanel.styles';
import { BoutRow } from './BoutRow';

const ROW_HEIGHT = 30;

export function BoutsPanel() {
  const { classes } = useStyles();
  const { bouts, selectedBoutId, selectBout, panToFrame, focusSizeFrames } = useStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: bouts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  useEffect(() => {
    if (selectedBoutId !== null) {
      const index = bouts.findIndex((b) => b.id === selectedBoutId);
      if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' });
    }
  }, [selectedBoutId, bouts, virtualizer]);

  const handleSelect = (id: number) => {
    selectBout(id);
    const bout = bouts.find((b) => b.id === id);
    if (bout) panToFrame(Math.max(0, bout.start - focusSizeFrames));
  };

  return (
    <Box ref={parentRef} className={classes.container}>
      <Box style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const bout = bouts[vItem.index];
          return (
            <BoutRow
              key={bout.id}
              bout={bout}
              isSelected={bout.id === selectedBoutId}
              onClick={() => handleSelect(bout.id)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: vItem.size,
                transform: `translateY(${vItem.start}px)`,
              }}
            />
          );
        })}
      </Box>
      {bouts.length === 0 && (
        <Text className={classes.empty}>No bouts loaded</Text>
      )}
    </Box>
  );
}
```

### 7.2 BoutRow Component

```typescript
// components/data/BoutsPanel/BoutRow.tsx
import { Group, Text, Box } from '@mantine/core';
import { useStyles } from './BoutsPanel.styles';
import { ACTUAL_COLORS } from '../../../types';
import { Bout } from '../../../types';

interface BoutRowProps {
  bout: Bout;
  isSelected: boolean;
  onClick: () => void;
  style: React.CSSProperties;
}

export function BoutRow({ bout, isSelected, onClick, style }: BoutRowProps) {
  const { classes, cx } = useStyles({ isSelected });
  
  return (
    <Box
      className={cx(classes.row, isSelected && classes.selectedRow)}
      onClick={onClick}
      style={{
        ...style,
        borderLeftColor: ACTUAL_COLORS[bout.actual],
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <Text c={ACTUAL_COLORS[bout.actual]} size="xs">
          {bout.behav}
        </Text>
        <Text c="dimmed" size="xs">
          #{bout.id}
        </Text>
        <Text c="dimmed" size="xs" ml="auto" ff="monospace">
          f{bout.start}-{bout.stop}
        </Text>
      </Group>
    </Box>
  );
}
```

---

## 8. Future Extensibility

### 8.1 TabPanel Structure (for future graph/annotation tabs)

```typescript
// components/layout/TabPanel/TabPanel.tsx
import { Tabs, TabsProps } from '@mantine/core';

export interface TabConfig {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabPanelProps extends Omit<TabsProps, 'children'> {
  tabs: TabConfig[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export function TabPanel({ tabs, activeTab, onTabChange, ...props }: TabPanelProps) {
  return (
    <Tabs value={activeTab} onChange={(value) => onTabChange?.(value || '')} {...props}>
      <Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.id} value={tab.id}>
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      
      {tabs.map((tab) => (
        <Tabs.Panel key={tab.id} value={tab.id} pt="sm">
          {tab.content}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
```

### 8.2 AnnotationOverlay Stub (for future video annotations)

```typescript
// components/video/AnnotationOverlay/AnnotationOverlay.tsx
import { Box } from '@mantine/core';

export interface Annotation {
  id: string;
  type: 'rectangle' | 'polygon' | 'point';
  frame: number;
  data: Record<string, unknown>;
}

interface AnnotationOverlayProps {
  annotations: Annotation[];
  currentFrame: number;
  onAnnotationChange?: (annotation: Annotation) => void;
}

export function AnnotationOverlay({ annotations, currentFrame, onAnnotationChange }: AnnotationOverlayProps) {
  const visibleAnnotations = annotations.filter((a) => a.frame === currentFrame);
  
  return (
    <Box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {visibleAnnotations.map((annotation) => (
        <Box
          key={annotation.id}
          style={{
            position: 'absolute',
            border: '2px solid var(--mantine-color-blue-5)',
            borderRadius: '2px',
          }}
        />
      ))}
    </Box>
  );
}
```

---

## 9. Migration Strategy

### 9.1 Phase 1: Foundation (Day 1)
1. Install Mantine packages
2. Create `theme/` directory structure
3. Wrap app with `MantineProvider`
4. Verify app still works

### 9.2 Phase 2: UI Library (Day 1-2)
1. Create `components/ui/` primitives
2. Test each component in isolation

### 9.3 Phase 3: PlaybackBar Redesign (Day 2)
1. Create playback components
2. Replace existing PlaybackBar
3. Test all playback functionality

### 9.4 Phase 4: Other Components (Day 2-3)
1. Redesign MenuBar
2. Redesign BoutsPanel
3. Redesign BoutInspector
4. Update BoutTimeline wrapper

### 9.5 Phase 5: Cleanup (Day 3)
1. Remove old styles.css
2. Remove unused button classes
3. Update any remaining inline styles

---

## 10. Testing Checklist

After migration, verify:

- [ ] Play/pause works
- [ ] Skip forward/backward works
- [ ] Timeline slider works
- [ ] Speed selector works
- [ ] Keypoints toggle works
- [ ] Focus toggle works
- [ ] Bout selection works
- [ ] Bout scrolling works
- [ ] Menu bar buttons work
- [ ] Keyboard shortcuts still work
- [ ] Dark theme displays correctly
- [ ] All panels resize correctly
- [ ] No console errors

---

## 11. Notes

- Keep canvas-based components (BoutTimeline, VideoPane canvas) mostly unchanged
- Use Mantine's `createStyles` for component-level styling
- Use Mantine's `Box`, `Group`, `Stack` for layout composition
- Leverage Mantine's built-in color scheme switching for future light mode support
- The existing `styles.css` should be gradually replaced with Mantine theme-aware styles
