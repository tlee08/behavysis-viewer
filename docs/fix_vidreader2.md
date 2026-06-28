# VideoPane freeze with per-frame rendering

**Session ID:** ses_0f1da0befffeVMe6hSM9hjB1ko
**Created:** 6/28/2026, 10:13:16 PM
**Updated:** 6/28/2026, 10:16:56 PM

---

## User

I am still finding that some videos still freeze when I play them, with the current setup in @src/renderer/src/components/VideoPane.tsx and @src/renderer/src/lib/frameReader.ts . Please investigate why this is happening. I want to keep the fine-grained per-frame rendering logic, but I didnt have this issue when I was using cv2.VideoCapture for a python version of this program. You are a distinguished technical principle software engineer solving this problem. Use karpathy guidelines, context7, tavily to investigate why.

---

## Root Cause Investigation

### Primary Cause: VideoFrame Resource Leak → Decoder Stall

The evidence is overwhelming from WebCodecs spec, MDN, and multiple independent sources:

> "Forgetting `frame.close()` exhausts the finite media resources the pipeline depends on, and once those are exhausted, decoding or frame emission stalls, producing the characteristic symptom of video that stutters progressively and then freezes." — [OpenReplay](https://blog.openreplay.com/real-time-video-processing-webcodecs-api)

> "VideoFrame objects are large enough that applications can crash with fewer than 100 active frames in memory." — MDN

Your `drawFrame` at `VideoPane.tsx:43-49` calls `drawImage` but **never calls `f.close()`**. The cache holds up to 90 VideoFrames open (`maxCache = 90`). Every frame drawn stays in cache with its GPU backing buffer held. The VideoDecoder's internal media resource pool is exhausted → callback stops firing → `getFrame` promises never resolve → video freezes.

### Secondary Cause: Decoder Thrashing at Cache Boundaries

Every ~90 frames, the decoder is `abort()`ed (which **closes** it), then immediately recreated via `ensureDecoder()`. The spec is clear: a closed decoder cannot be reused. Recreating the decoder + refeeding 90 samples takes time, creating a decoding gap. During this gap, `drawFrame` calls pile up as unsettled promises.

### Tertiary Cause: No Error Recovery

If the decoder errors (e.g., from resource exhaustion), `abort()` rejects all waiter promises. `drawFrame`'s `.catch()` only logs the error — the canvas never updates but the play loop keeps ticking, producing an apparent freeze.

### Why cv2.VideoCapture Didn't Have This Issue

`cv2.VideoCapture` manages frame buffers internally in C++, releasing decoded frames after `read()`. There's no manual resource management — the equivalent of `close()` is implicit. WebCodecs requires **explicit** `frame.close()` calls; the GC does not know about GPU media resources.

---

## Fix Plan

Three surgical changes, no architectural rewrite:

### 1. `VideoPane.tsx` — Close frames after drawing (CRITICAL)

```diff
  reader
    .getFrame(i)
    .then((f) => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(f, 0, 0, w, h);
+     f.close();
    })
```

### 2. `frameReader.ts` — Remove frame from cache on retrieval (transfer ownership)

When `getFrame(i)` returns a cached frame, the caller now owns it and is responsible for closing it. The cache entry must be removed so a closed frame isn't served again:

```diff
  const cached = this.cache.get(i);
  if (cached) {
-   this.cache.delete(i);
-   this.cache.set(i, cached);
+   this.cache.delete(i);
    return cached;
  }
```

Additionally, remove the `LRU touch` re-insertion — it serves no purpose when frames are consumed once.

### 3. `frameReader.ts` — Replace close+recreate with flush+refeed

Instead of `abort()` (which `close()`s the decoder) then `ensureDecoder()` (which creates a new one), use `flush()` to drain pending work, then refeed from the new keyframe. Per spec, the first chunk after flush must be a key frame (already guaranteed by `findKeyframe()`).

```diff
  if (this.active) {
    if (i >= this.active.start && i <= this.active.end) {
      // ... waiter registration
    }
-   this.abort();
+   // flush + clear waiters, then refeed below
+   this.clearWaiters(new Error("Seeked"));
+   this.decoder?.flush().catch(() => {});
  }

  // ... new session setup
- this.ensureDecoder();
+ this.ensureDecoder(); // only creates if needed (state !== "configured")
```

This eliminates the decoder destruction/recreation cycle at cache boundaries.

### 4. `frameReader.ts` — Guard against decodeQueueSize blowup (safety)

Feed frames in controlled batches rather than 90 at once, respecting `decoder.decodeQueueSize`:

```typescript
private feed(from: number, to: number): void {
  const MAX_QUEUE = 10;
  // feed initial batch
  // use ondequeue to feed more when queue drains
}
```

Or simpler: increase `maxCache` (e.g., to 300) so the boundary crossing happens less often, and limit the initial feed batch size.

---

## What I'm NOT Changing

- The fine-grained `getFrame(i)` per-frame API stays intact
- The canvas-based rendering approach stays
- The `requestAnimationFrame` play loop stays
- MP4Box parsing stays

---

Shall I proceed with implementation?

---
