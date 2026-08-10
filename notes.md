## Root cause analysis

There are **two compounding issues** causing periodic video freezes:

### Issue 1: Decode window restart (your code — `frameReader.ts`)

`getFrame(i)` creates a decode session that ranges from the **nearest keyframe** to `i + maxCache` (~170 frames for 640×480). During sequential playback, when the playhead reaches the window's `end`, the code at `frameReader.ts:95-100`:

1. Cancels the active session (rejecting all waiters)
2. Calls `decoder.flush()` (which **invalidates the decode pipeline** and forces a keyframe requirement)
3. Finds the nearest keyframe (could be dozens/hundreds of frames behind)
4. Starts a new decode from that keyframe, queueing ALL intermediate samples at once via `feed()`
5. The decoder must churn through all those frames before outputting the one you actually need

`drawFrame(i)` is waiting on a promise. The canvas freezes until the decoder catches up.

### Issue 2: WebCodecs VideoDecoder "internal pending output" queue (platform)

Per the [WebCodecs spec](https://www.w3.org/TR/webcodecs/#internal-pending-output) and [w3c/webcodecs#698](https://github.com/w3c/webcodecs/issues/698), the decoder may **hold decoded frames back** and only emit them when more input is pushed in — or on `flush()`. With hardware H.264 decoding on Chromium, there's a [known issue](https://issues.chromium.org/issues/40857774) where outputs are buffered until the **next keyframe** arrives. Your `feed()` batch-queues 500+ samples, but the decoder may still throttle output.

The periodic gap corresponds to whichever is shorter: your `maxCache` window size OR the video's GOP/keyframe interval.

**Why other components keep moving**: keypoints, boutTimeline, and playback bar are all driven by `requestAnimationFrame` + store data. None of them block on `reader.getFrame(i).then(...)` — only the video canvas does.

---

## Proposed fix (simplest, highest-confidence)

### A. Extend instead of restart for sequential playback

Instead of cancelling the active session when `i > end`, **extend `end`** and continue feeding chunks forward. Only restart on actual seeks (non-adjacent frames).

In `getFrame(i)`:

- If sequential (i === lastRequested + 1) and within reasonable distance: just extend `end` and feed new chunks
- If seek (non-adjacent): do the current keyframe-restart logic

### B. `optimizeForLatency: true`

Add to `VideoDecoder.configure()` config (`frameReader.ts:154`):

```js
this.decoder.configure({
  codec,
  description,
  codedWidth,
  codedHeight,
  optimizeForLatency: true,
});
```

### C. Incremental feeding via `dequeue` event

Instead of batch-queueing all samples in `feed()`, use a small initial batch and then the `dequeue` event to drip-feed more as the decoder consumes them. This keeps the pipeline saturated without overwhelming it, giving frames sooner.

### Why it should work

- **A**: Eliminates the entire cause of freezes for sequential playback — no decoder restart, no flush, no keyframe re-seek.
- **B**: Tells the decoder to output frames ASAP instead of holding them for batch processing.
- **C**: Keeps the internal pending output queue from starving, pushing frames through continuously.

### Why it might not work

- **A**: Doesn't help with seeks (scrubbing), which still need the keyframe restart. Also has edge cases: what happens when `end` is extended to `totalFrames`?
- **B**: Per the Chromium team ([comment](https://github.com/w3c/webcodecs/issues/698#issuecomment-2334491864)), this flag may only affect software decoders. Hardware H.264 decoders may ignore it.
- **C**: The internal pending output queue depth is **platform-dependent and uncontrollable**. Even with continuous feeding, some frames may still be held back on certain hardware/drivers.

### Fallback: Dual-decoder look-ahead

If A isn't enough, run a **second VideoDecoder** that pre-decodes the next window while playback consumes the current one. Risk: many GPUs only support **one** hardware decode session; the second falls back to slow software decode.
