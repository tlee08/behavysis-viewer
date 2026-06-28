# Video freezing from WebCodecs VideoFrame leak

**Session ID:** ses_0f1af41f3ffepMikD8aTDgW1Nn
**Created:** 6/28/2026, 11:00:00 PM
**Updated:** 6/28/2026, 11:00:36 PM

---

## User

Read @docs/fix_vidreader2.md and @docs/fix_vidreader1.md .

For recommendations from other team members. regarding the below problem

```
I am still finding that some videos still freeze when I play them, with the current setup in @src/renderer/src/components/VideoPane.tsx and @src/renderer/src/lib/frameReader.ts . Please investigate why this is happening. I want to keep the fine-grained per-frame rendering logic, but I didnt have this issue when I was using cv2.VideoCapture for a python version of this program. You are a distinguished technical principle software engineer solving this problem. Use karpathy guidelines, context7, tavily to investigate why.
```

Your task as the senior principle software engineer is to present the root cause and solution to this problem.
Remember, I am only experiencing this on this repo, and not when I use python+cv2.VideoCapture. Use karpathy guidelines, tavily, context7 to inform your critical analysis and troubleshooting.

---

## Root Cause (both documents independently agree)

**Primary: VideoFrame GPU resource exhaustion.** Every frame drawn in `VideoPane.tsx:43-48` calls `drawImage` but **never calls `f.close()`**. The cache in `frameReader.ts:23` holds up to **90 open `VideoFrame` objects**, each pinning a GPU decoder buffer slot. Hardware decoders only have **~16-32 buffer slots**. Once exhausted, the decoder stalls and callbacks stop firing → `getFrame` promises never resolve → video freezes.

**Compounding factors:**

1. **LRU touch keeps frames alive** (`frameReader.ts:86-90`): cache does `delete`+`set` (re-insertion) without closing. Frames survive in cache even after being served.
2. **Decoder destruction at cache boundaries** (`frameReader.ts:99`): `abort()` closes the decoder, then `ensureDecoder()` recreates it every ~90 frames. This creates a decoding gap.
3. **`flush()` fire-and-forget** (`frameReader.ts:114`): `flush()` is never awaited, so frames at batch edges may never be emitted.
4. **No decode backpressure** (`frameReader.ts:148-163`): all 90 chunks fed at once, overwhelming the decoder.
5. **No backpressure in play loop** (`VideoPane.tsx:102-103`): `drawFrame` is fire-and-forget; the clock advances whether or not the previous frame rendered.
6. **Silent decode errors** (`frameReader.ts:159-161`): `catch {}` swallows failures.

### Why `cv2.VideoCapture` didn't have this

OpenCV decodes to CPU RAM (unlimited). WebCodecs defaults to hardware acceleration (GPU buffers, limited ~16-32 slots). OpenCV manages frame lifecycle implicitly; WebCodecs requires explicit `close()`.

---

## Recommended Fix Plan

Both documents agree on the core fix. I recommend the **ImageBitmap approach** from fix_vidreader1 as the most robust, plus the surgical fixes from fix_vidreader2:

### Layer 1: Eliminate the GPU buffer leak (make VideoFrame caching safe)

**`frameReader.ts` — Convert to ImageBitmap immediately on decode:**

In `onFrame()` (`frameReader.ts:165`), when a frame arrives:

```typescript
const bitmap = await createImageBitmap(frame);
frame.close(); // Release GPU slot immediately
this.addToCache(idx, bitmap);
```

Change cache type from `Map<number, VideoFrame>` to `Map<number, ImageBitmap>`. ImageBitmap lives in system memory — caching 90+ is safe.

### Layer 2: Close frames after drawing

**`VideoPane.tsx:43-48` — Even with ImageBitmap, this is belt-and-suspenders:**

```typescript
.then((f) => {
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(f, 0, 0, w, h);
  f.close();
})
```

### Layer 3: Fix cache ownership at retrieval

**`frameReader.ts:86-91` — Remove LRU re-insertion, transfer ownership:**

```diff
  const cached = this.cache.get(i);
  if (cached) {
-   this.cache.delete(i);
-   this.cache.set(i, cached);
+   this.cache.delete(i);
    return cached;
  }
```

### Layer 4: Replace `abort()` + recreate with `flush()` + refeed

**`frameReader.ts:99` — Use flush instead of destroying the decoder:**

```typescript
if (i >= this.active.start && i <= this.active.end) {
  return new Promise(...);
}
// Instead of this.abort():
this.clearWaiters(new Error("Seeked"));
this.decoder?.flush().catch(() => {});
```

### Layer 5: Await `flush()` + add decode queue backpressure

**`frameReader.ts:114` — await flush, and in `feed()` check `decodeQueueSize`:**

```typescript
await this.decoder!.flush();
```

**`feed()` — batch with backpressure:**

```typescript
const MAX_QUEUE = 10;
for (let i = from; i <= to; i++) {
  if (this.decoder!.decodeQueueSize >= MAX_QUEUE) {
    // Use ondequeue event or await flush to drain before continuing
    break;
  }
  this.decoder!.decode(chunk);
}
```

### Layer 6: Fix bug at `onFrame` (`frameReader.ts:177-178`)

Currently an `inWindow` frame is always added to cache even if it already exists, and even the waiter-resolve path can receive a closed frame. The ImageBitmap conversion makes this moot, but the logic should still be tightened.

### Optional: Play loop backpressure

`VideoPane.tsx:102-103` — make the play loop await each draw:

```typescript
await drawFrame(clock.current);
drawKpts(clock.current);
```

This prevents queueing multiple unresolved draws. However, with ImageBitmap caching, the read path is synchronous, so this becomes less critical.

---

## What stays unchanged

- Fine-grained `getFrame(i)` per-frame API
- Canvas-based rendering
- `requestAnimationFrame` play loop
- MP4Box parsing

---

## Questions for you

1. **How large are your videos?** (resolution, duration, file size) — this affects the safe `maxCache` and ImageBitmap memory budget.

2. **Do you need backward/random seeking?** The current cache-evict-on-serve model means seeking backward requires re-decoding from the nearest keyframe. If you need bidirectional seeking, a different cache strategy is needed.

3. **Should I proceed with implementation?** The plan above is surgical (no rewrite) and addresses all identified issues.

---
