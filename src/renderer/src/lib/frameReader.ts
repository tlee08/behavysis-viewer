// FrameReader — frame-exact video decoding via WebCodecs + mp4box.js

import * as MP4Box from "mp4box";

export interface FrameMetadata {
  codec: string;
  codedWidth: number;
  codedHeight: number;
  fps: number;
  totalFrames: number;
  keyframeIndices: number[];
  timescale: number;
  description: Uint8Array;
}

type Waiter = {
  resolve: (frame: VideoFrame) => void;
  reject: (err: Error) => void;
};

export class FrameReader {
  private decoder: VideoDecoder | null = null;
  private decoderConfigured = false;
  private samples: MP4Box.Sample[];
  private videoBuffer: ArrayBuffer;

  private activeDecode: {
    decodeStartFrame: number;
    decodeEndFrame: number;
    decodedCount: number;
    waiters: Map<number, Waiter>;
  } | null = null;

  private frameCache = new Map<number, VideoFrame>();
  private cacheSize = 90;

  public readonly metadata: FrameMetadata;

  private constructor(
    metadata: FrameMetadata,
    samples: MP4Box.Sample[],
    videoBuffer: ArrayBuffer,
  ) {
    this.metadata = metadata;
    this.samples = samples;
    this.videoBuffer = videoBuffer;
  }

  static async init(buffer: ArrayBuffer): Promise<FrameReader> {
    const arrBuf = buffer as ArrayBuffer;
    arrBuf.fileStart = 0;
    console.log("FrameReader: parsing MP4,", buffer.byteLength, "bytes");

    const mp4file = MP4Box.createFile();

    const ready = new Promise<{
      metadata: FrameMetadata;
      samples: MP4Box.Sample[];
    }>((resolve, reject) => {
      mp4file.onReady = (info) => {
        try {
          const vt = info.videoTracks[0];
          if (!vt) throw new Error("No video track");

          const samples = mp4file.getTrackSamplesInfo(vt.id);
          const keyframeIndices: number[] = [];
          for (const s of samples) {
            if (s.is_sync) keyframeIndices.push(s.number);
          }

          resolve({
            metadata: {
              codec: uppercaseCodec(vt.codec),
              codedWidth: vt.video?.width ?? vt.track_width,
              codedHeight: vt.video?.height ?? vt.track_height,
              fps: vt.nb_samples / (vt.samples_duration / vt.timescale),
              totalFrames: vt.nb_samples,
              keyframeIndices,
              timescale: vt.timescale,
              description: extractDescription(mp4file),
            },
            samples,
          });
        } catch (err) {
          reject(err);
        }
      };
      mp4file.onError = (_source, msg) => {
        reject(new Error(`mp4box error: ${msg}`));
      };
    });

    mp4file.appendBuffer(arrBuf);
    mp4file.flush();

    const { metadata, samples } = await ready;
    console.log(
      "FrameReader: ready, codec:", metadata.codec,
      "fps:", metadata.fps.toFixed(2),
      "frames:", metadata.totalFrames,
      "keyframes:", metadata.keyframeIndices.length,
      "desc:", metadata.description.length, "bytes",
    );
    return new FrameReader(metadata, samples, buffer);
  }

  async getFrame(frameIndex: number): Promise<VideoFrame> {
    if (frameIndex < 0 || frameIndex >= this.metadata.totalFrames) {
      throw new Error(
        `Frame ${frameIndex} out of range (0–${this.metadata.totalFrames - 1})`,
      );
    }

    const cached = this.frameCache.get(frameIndex);
    if (cached) return cached;

    // If active decode is in progress and this frame is within its range,
    // queue as a secondary waiter instead of aborting
    if (this.activeDecode) {
      const ad = this.activeDecode;
      if (
        frameIndex >= ad.decodeStartFrame &&
        frameIndex <= ad.decodeEndFrame
      ) {
        return new Promise((resolve, reject) => {
          ad.waiters.set(frameIndex, { resolve, reject });
        });
      }
      // Frame is outside range — abort and restart
      this.abortDecode();
    }

    const keyframeIdx = this.findNearestKeyframe(frameIndex);
    const endFrame = Math.min(
      frameIndex + this.cacheSize,
      this.metadata.totalFrames - 1,
    );

    return new Promise<VideoFrame>((resolve, reject) => {
      this.activeDecode = {
        decodeStartFrame: keyframeIdx,
        decodeEndFrame: endFrame,
        decodedCount: 0,
        waiters: new Map([[frameIndex, { resolve, reject }]]),
      };

      console.log("FrameReader: decode", keyframeIdx, "→", endFrame, "(target:", frameIndex, ")");

      this.ensureDecoder();
      this.feedEncodedSamples(keyframeIdx, endFrame);
      this.decoder!.flush().catch((err) => {
        console.error("FrameReader: flush error:", err.message);
      });
    });
  }

  private feedEncodedSamples(fromFrame: number, toFrame: number): void {
    const ts = this.metadata.timescale;

    for (let f = fromFrame; f <= toFrame; f++) {
      const s = this.samples[f];
      if (!s) {
        console.warn("FrameReader: no sample at", f);
        continue;
      }
      if (s.offset === undefined) {
        console.warn("FrameReader: sample", f, "no offset");
        continue;
      }
      if (s.size === 0) {
        console.warn("FrameReader: sample", f, "size 0");
        continue;
      }

      try {
        const data = new Uint8Array(this.videoBuffer, s.offset, s.size);
        const chunk = new EncodedVideoChunk({
          type: s.is_sync ? "key" : "delta",
          timestamp: Math.round((s.cts / ts) * 1_000_000),
          duration: Math.round((s.duration / ts) * 1_000_000),
          data,
        });
        this.decoder!.decode(chunk);
      } catch (err: any) {
        console.error("FrameReader: decode() failed at sample", f, ":", err.message);
      }
    }
  }

  private ensureDecoder(): void {
    if (this.decoder && this.decoderConfigured) return;

    if (this.decoder) {
      try { this.decoder.close(); } catch { /* ok */ }
      this.decoder = null;
    }

    this.decoderConfigured = false;

    const { codec, codedWidth, codedHeight, description } = this.metadata;
    console.log("FrameReader: creating VideoDecoder, codec:", codec);

    this.decoder = new VideoDecoder({
      output: (frame) => this.handleFrame(frame),
      error: (err) => {
        console.error("VideoDecoder error:", err.message);
        this.decoderConfigured = false;
        this.failAllWaiters(new Error(`VideoDecoder error: ${err.message}`));
      },
    });

    this.decoder.configure({ codec, description, codedWidth, codedHeight });
    this.decoderConfigured = true;
    console.log("FrameReader: decoder configured, state:", this.decoder.state);
  }

  private handleFrame(frame: VideoFrame): void {
    const ad = this.activeDecode;
    if (!ad) {
      frame.close();
      return;
    }

    const currentFrame = ad.decodeStartFrame + ad.decodedCount;
    ad.decodedCount++;

    // Check if anyone is waiting for this exact frame
    const waiter = ad.waiters.get(currentFrame);
    if (waiter) {
      this.addToCache(currentFrame, frame);
      waiter.resolve(frame);
      ad.waiters.delete(currentFrame);
      // If no more waiters and we've decoded past the last one, stop
      if (ad.waiters.size === 0 && currentFrame >= ad.decodeEndFrame) {
        this.activeDecode = null;
      }
      return;
    }

    // Cache future frames for fast sequential access
    if (
      currentFrame <= ad.decodeEndFrame &&
      !this.frameCache.has(currentFrame)
    ) {
      this.addToCache(currentFrame, frame);
    } else {
      frame.close();
    }

    // All done – stop tracking
    if (currentFrame >= ad.decodeEndFrame && ad.waiters.size === 0) {
      this.activeDecode = null;
    }
  }

  private abortDecode(): void {
    this.failAllWaiters(new Error("Decode aborted"));
    this.activeDecode = null;

    if (this.decoder && this.decoderConfigured) {
      this.decoderConfigured = false;
      try { this.decoder.close(); } catch { /* ok */ }
      this.decoder = null;
    }
  }

  private failAllWaiters(err: Error): void {
    if (!this.activeDecode) return;
    for (const w of this.activeDecode.waiters.values()) {
      w.reject(err);
    }
    this.activeDecode = null;
  }

  private findNearestKeyframe(target: number): number {
    for (let i = this.metadata.keyframeIndices.length - 1; i >= 0; i--) {
      const kf = this.metadata.keyframeIndices[i];
      if (kf <= target) return kf;
    }
    return 0;
  }

  private addToCache(frameIndex: number, frame: VideoFrame): void {
    if (this.frameCache.size >= this.cacheSize) {
      let farthest = frameIndex;
      let farthestDist = 0;
      for (const key of this.frameCache.keys()) {
        const dist = Math.abs(key - frameIndex);
        if (dist > farthestDist) {
          farthestDist = dist;
          farthest = key;
        }
      }
      if (farthest !== frameIndex) {
        this.frameCache.get(farthest)?.close();
        this.frameCache.delete(farthest);
      }
    }
    this.frameCache.set(frameIndex, frame);
  }

  close(): void {
    this.activeDecode = null;
    for (const frame of this.frameCache.values()) frame.close();
    this.frameCache.clear();
    if (this.decoder) {
      try { this.decoder.close(); } catch { /* ok */ }
    }
    this.decoder = null;
    this.decoderConfigured = false;
  }
}

function uppercaseCodec(codec: string): string {
  const idx = codec.indexOf(".");
  if (idx === -1) return codec;
  return codec.slice(0, idx + 1) + codec.slice(idx + 1).toUpperCase();
}

function extractDescription(mp4file: MP4Box.ISOFile): Uint8Array {
  const avcC = mp4file.getBox("avcC");
  if (avcC) return rebuildAVCC(avcC as any);

  const hvcC = mp4file.getBox("hvcC");
  if (hvcC) return rebuildHVCC(hvcC as any);

  throw new Error(
    "Could not extract codec description from MP4. Supported: AVC (avcC), HEVC (hvcC)",
  );
}

function rebuildAVCC(avcC: Record<string, unknown>): Uint8Array {
  const version = (avcC.configurationVersion as number) ?? 1;
  const profile = (avcC.AVCProfileIndication as number) ?? 0;
  const compat = (avcC.profile_compatibility as number) ?? 0;
  const level = (avcC.AVCLevelIndication as number) ?? 0;
  const lenSize = ((avcC.lengthSizeMinusOne as number) ?? 3) & 0x03;

  const spsList = avcC.SPS as ArrayLike<{ data: Uint8Array; length: number }>;
  const ppsList = avcC.PPS as ArrayLike<{ data: Uint8Array; length: number }>;
  const numSPS = spsList?.length ?? 0;
  const numPPS = ppsList?.length ?? 0;

  let totalSize = 6 + 1;
  for (let i = 0; i < numSPS; i++) totalSize += 2 + spsList[i].length;
  for (let i = 0; i < numPPS; i++) totalSize += 2 + ppsList[i].length;

  const buf = new Uint8Array(totalSize);
  let off = 0;
  buf[off++] = version;
  buf[off++] = profile;
  buf[off++] = compat;
  buf[off++] = level;
  buf[off++] = 0xfc | lenSize;
  buf[off++] = 0xe0 | (numSPS & 0x1f);
  for (let i = 0; i < numSPS; i++) {
    const len = spsList[i].length;
    buf[off++] = (len >> 8) & 0xff;
    buf[off++] = len & 0xff;
    buf.set(spsList[i].data, off);
    off += len;
  }
  buf[off++] = numPPS & 0xff;
  for (let i = 0; i < numPPS; i++) {
    const len = ppsList[i].length;
    buf[off++] = (len >> 8) & 0xff;
    buf[off++] = len & 0xff;
    buf.set(ppsList[i].data, off);
    off += len;
  }
  return buf;
}

function rebuildHVCC(_hvcC: Record<string, unknown>): Uint8Array {
  throw new Error("HEVC (hvcC) codec description rebuild not yet implemented");
}
