# Video freezing in VideoPane and frameReader

**Session ID:** ses_0f1d57d32ffeL7qiIvx7OdOMEk
**Created:** 6/28/2026, 10:18:14 PM
**Updated:** 6/28/2026, 10:20:38 PM

---

## User

I am still finding that some videos still freeze when I play them, with the current setup in @src/renderer/src/components/VideoPane.tsx and @src/renderer/src/lib/frameReader.ts . Please investigate why this is happening. I want to keep the fine-grained per-frame rendering logic, but I didnt have this issue when I was using cv2.VideoCapture for a python version of this program. You are a distinguished technical principle software engineer solving this problem. Use karpathy guidelines, context7, tavily to investigate why.

---

## Root Cause Analysis: Video Freezing

### Primary Cause: Hardware Decoder Buffer Exhaustion

**The smoking gun** is in `frameReader.ts:24`:

```typescript
private readonly maxCache = 90;
private cache = new Map<number, VideoFrame>();
```

You're caching up to **90 `VideoFrame` objects**. When using hardware-accelerated decoding (the default in Chromium/Electron), each unclosed `VideoFrame` holds a reference to a **GPU decoder buffer slot**. Hardware decoders typically have only **16-32 buffer slots**. Caching 90 frames exhausts these slots, causing the decoder to **stall** — it literally pauses, waiting for frames to be released.

The W3C WebCodecs spec explicitly warns:

> _"Authors are encouraged to call `close()` on output VideoFrames immediately when frames are no longer needed. The underlying media resources are owned by the VideoDecoder and failing to release them (or waiting for garbage collection) can cause decoding to stall."_

This is documented in:

- [GitHub w3c/webcodecs #680: "VideoDecoder Stalls"](https://github.com/w3c/webcodecs/discussions/680)
- [StackOverflow: WebCodec API hangs in Windows](https://stackoverflow.com/questions/79686288/webcodec-api-hangs-in-windows-but-not-in-linux)
- [webrtchacks: Hardware decoders use limited memory buffers](https://webrtchacks.com/real-time-video-processing-with-webcodecs-and-streams-processing-pipelines-part-1)

### Why `cv2.VideoCapture` Didn't Have This Problem

| Aspect              | `cv2.VideoCapture` (Python) | WebCodecs `VideoDecoder` (Electron) |
| ------------------- | --------------------------- | ----------------------------------- |
| **Decoding target** | System RAM (CPU)            | GPU buffer (hardware)               |
| **Buffer limit**    | Unlimited (system memory)   | ~16-32 slots                        |
| **Read pattern**    | Synchronous blocking        | Async callback-based                |
| **Frame lifetime**  | Managed by OpenCV/NumPy     | Must explicitly `close()`           |
| **Backpressure**    | Inherent (blocking read)    | None by default                     |

OpenCV + FFmpeg decodes to **CPU RAM**, which is essentially unlimited. WebCodecs defaults to **hardware acceleration**, which has strict buffer limits.

---

### Secondary Issues Compounding the Freeze

**1. `flush()` not awaited** (`frameReader.ts:114`):

```typescript
this.decoder!.flush().catch(() => {}); // Fire-and-forget
```

`flush()` must be awaited for frames at batch boundaries to be emitted. Without it, the `getFrame()` Promise may hang.

**2. Async draw without backpressure** (`VideoPane.tsx:102-103`):

```typescript
drawFrame(clock.current); // Returns immediately, doesn't wait for render
drawKpts(clock.current);
```

The play loop advances `clock.current` regardless of whether the previous frame was drawn. Frames pile up, overwhelming the decoder.

**3. Silent error swallowing** (`frameReader.ts:159-161`):

```typescript
try {
  this.decoder!.decode(chunk);
} catch {} // Errors lost
```

Decode failures are silently ignored, leading to lost frames and unresolved promises.

**4. B-frame reordering delay**:
H.264 Main/High profile requires 4-16 frames to be buffered before output. The current code feeds all chunks at once but doesn't properly coordinate with `flush()`.

---

## Proposed Fix Plan

### Fix 1: Convert `VideoFrame` → `ImageBitmap` Immediately

**Key insight from StackOverflow**: Use `createImageBitmap(frame)` to copy from GPU buffer to system memory, then `frame.close()` immediately.

```typescript
// frameReader.ts - change cache type
private cache = new Map<number, ImageBitmap>();  // Not VideoFrame
private readonly maxCache = 90;  // Safe now - not GPU buffers

// In onFrame():
const bitmap = await createImageBitmap(frame);
frame.close();  // Release GPU buffer slot IMMEDIATELY
this.addToCache(idx, bitmap);
```

`ImageBitmap` lives in browser memory (not GPU decoder buffers), so caching 90 is safe.

### Fix 2: Await `flush()` Properly

```typescript
async getFrame(i: number): Promise<ImageBitmap> {
  // ... setup decode batch ...
  this.feed(kf, end);
  await this.decoder!.flush();  // MUST await
  // Promise resolves via waiter callback
}
```

### Fix 3: Add Decode Queue Backpressure

Check `decoder.decodeQueueSize` before feeding more chunks:

```typescript
const DECODE_QUEUE_LIMIT = 16;

private feed(from: number, to: number): void {
  for (let i = from; i <= to; i++) {
    if (this.decoder!.decodeQueueSize >= DECODE_QUEUE_LIMIT) {
      // Wait for dequeue event before continuing
      break;
    }
    // ... decode chunk ...
  }
}
```

### Fix 4: Synchronize Draw in Play Loop

Wait for the frame before advancing:

```typescript
const tick = async (now: number) => {
  // ... timing logic ...
  const frame = await reader.getFrame(clock.current);
  ctx.drawImage(frame, 0, 0, w, h);
  frame.close?.(); // If still VideoFrame
  // NOW advance clock
};
```

Or use a "render-ahead" buffer of ~2-3 frames maximum.

---

## Clarifying Questions

Before I implement, I'd like to confirm a few things:

1. **What video profile are you using?** (Baseline, Main, High H.264?) Baseline has no B-frames and is easier; Main/High requires proper reordering.

2. **Do you need backward seeks?** If you need to play backward, the caching strategy changes — you'd need a different approach (like pre-decoding to ImageBitmap cache in both directions).

3. **What's the typical FPS and resolution?** Higher values mean more decoder pressure.

---
