// FrameReader — frame-exact video decoding via WebCodecs + mp4box.js
//
// Architecture:
//   1. Parse MP4 container with mp4box.js → codec config + sample index
//   2. Configure VideoDecoder with codec description (avcC bytes)
//   3. On seek(frameN): find nearest keyframe → seek mp4box → extract samples →
//      feed to VideoDecoder → count output frames → return target frame
//   4. Cache decoded frames in sliding window for instant small-seek replay
//
// Runs in the renderer process where WebCodecs (VideoDecoder, VideoFrame) and
// mp4box.js (ISOFile) are available.

import * as MP4Box from "mp4box";

export interface FrameMetadata {
  codec: string;
  codedWidth: number;
  codedHeight: number;
  fps: number;
  totalFrames: number;
  keyframeIndices: number[];  // frame indices (0-based) that are keyframes
  timescale: number;
  description: Uint8Array;     // codec extradata (avcC / hvcC / vp9 vpcC)
}

export class FrameReader {
  private mp4file: MP4Box.ISOFile;
  private decoder: VideoDecoder | null = null;
  private trackId: number;
  private samples: MP4Box.Sample[];
  private timescale: number;

  // Keyframe sample numbers (1-based, maps frame → sample)
  private keyframeSet: Set<number> = new Set();

  // Async state for getFrame resolution
  private pendingResolve: ((frame: VideoFrame) => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;
  private targetFrame: number = -1;
  private decodedCount: number = 0;
  private decodeStartFrame: number = 0;
  private isExtracting: boolean = false;

  // Sliding window cache
  private frameCache = new Map<number, VideoFrame>();
  private cacheSize = 90;

  public readonly metadata: FrameMetadata;

  private constructor(
    mp4file: MP4Box.ISOFile,
    metadata: FrameMetadata,
    trackId: number,
    samples: MP4Box.Sample[],
    keyframeSet: Set<number>,
  ) {
    this.mp4file = mp4file;
    this.metadata = metadata;
    this.trackId = trackId;
    this.samples = samples;
    this.timescale = metadata.timescale;
    this.keyframeSet = keyframeSet;
  }

  static async init(buffer: ArrayBuffer): Promise<FrameReader> {
    const arrBuf = buffer as ArrayBuffer;
    arrBuf.fileStart = 0;
    console.log("FrameReader: parsing MP4, buffer size:", buffer.byteLength, "bytes");

    const mp4file = MP4Box.createFile();

    const ready = new Promise<{
      metadata: FrameMetadata;
      trackId: number;
      samples: MP4Box.Sample[];
      keyframeSet: Set<number>;
    }>((resolve, reject) => {
      mp4file.onReady = (info) => {
        try {
          const vt = info.videoTracks[0];
          if (!vt) {
            reject(new Error("No video track found in MP4"));
            return;
          }

          const samples = mp4file.getTrackSamplesInfo(vt.id);
          const keyframeSet = new Set<number>();
          const keyframeIndices: number[] = [];

          for (const s of samples) {
            if (s.is_sync) {
              keyframeSet.add(s.number);
              keyframeIndices.push(s.number);  // sample number = frame index (0-based)
            }
          }

          const description = extractDescription(mp4file);

          resolve({
            metadata: {
              codec: uppercaseCodec(vt.codec),
              codedWidth: vt.video?.width ?? vt.track_width,
              codedHeight: vt.video?.height ?? vt.track_height,
              fps: vt.nb_samples / (vt.samples_duration / vt.timescale),
              totalFrames: vt.nb_samples,
              keyframeIndices,
              timescale: vt.timescale,
              description,
            },
            trackId: vt.id,
            samples,
            keyframeSet,
          });
        } catch (err) {
          reject(err);
        }
      };

      mp4file.onError = (source, msg) => {
        reject(new Error(`mp4box error [${source}]: ${msg}`));
      };
    });

    mp4file.appendBuffer(arrBuf);
    mp4file.flush();

          const { metadata, trackId, samples, keyframeSet } = await ready;
    console.log("FrameReader: ready, codec:", metadata.codec, "fps:", metadata.fps.toFixed(2), "frames:", metadata.totalFrames, "description:", metadata.description.length, "bytes");
    return new FrameReader(mp4file, metadata, trackId, samples, keyframeSet);
  }

  async getFrame(frameIndex: number): Promise<VideoFrame> {
    if (frameIndex < 0 || frameIndex >= this.metadata.totalFrames) {
      throw new Error(
        `Frame ${frameIndex} out of range (0–${this.metadata.totalFrames - 1})`,
      );
    }

    const cached = this.frameCache.get(frameIndex);
    if (cached) return cached;

    console.log("FrameReader: getFrame", frameIndex, "(nearest keyframe:", this.findNearestKeyframe(frameIndex), ")");

    const keyframeFrameIdx = this.findNearestKeyframe(frameIndex);
    const keyframeSampleNum = keyframeFrameIdx;

    const allSamples = this.mp4file.getTrackSamplesInfo(this.trackId);
    const keyframeSample = allSamples.find(
      (s) => s.number === keyframeSampleNum,
    );
    if (!keyframeSample) {
      throw new Error(
        `Sample ${keyframeSampleNum} not found in track (got ${allSamples.length} samples)`,
      );
    }

    return new Promise<VideoFrame>((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      this.targetFrame = frameIndex;
      this.decodedCount = 0;
      this.decodeStartFrame = keyframeFrameIdx;

      this.ensureDecoder();

      this.mp4file.stop();

      const seekTime = keyframeSample.cts / this.timescale;

      // setExtractionOptions before starting extraction
      if (this.mp4file.extractedTracks.length === 0) {
        this.mp4file.setExtractionOptions(this.trackId);
      }

      this.mp4file.onSamples = (_id, _user, chunkSamples) => {
        for (const sample of chunkSamples) {
          if (!sample.data || sample.data.length === 0) continue;

          try {
            const chunk = new EncodedVideoChunk({
              type: sample.is_sync ? "key" : "delta",
              timestamp: Math.round((sample.cts / this.timescale) * 1_000_000),
              duration: Math.round((sample.duration / this.timescale) * 1_000_000),
              data: sample.data,
            });

            this.decoder!.decode(chunk);
          } catch (chunkErr: any) {
            console.error("decode failed for sample", sample.number, ":", chunkErr.message);
          }
        }
      };

      this.mp4file.seek(seekTime, true);
      this.mp4file.start();
    });
  }

  private ensureDecoder(): void {
    if (this.decoder && this.decoder.state !== "closed") return;

    if (this.decoder) {
      try { this.decoder.close(); } catch { /* closed already */ }
      this.decoder = null;
    }

    console.log("FrameReader: creating VideoDecoder...");
    const { codec, codedWidth, codedHeight, description } = this.metadata;

    this.decoder = new VideoDecoder({
      output: (frame) => this.handleFrame(frame),
      error: (err) => {
        console.error("VideoDecoder error:", err.message, err);
        this.decoder = null;
        this.pendingReject?.(new Error(`VideoDecoder error: ${err.message}`));
      },
    });

    const config: VideoDecoderConfig = {
      codec,
      description,
      codedWidth,
      codedHeight,
    };

    try {
      this.decoder.configure(config);
    } catch (configureErr: any) {
      console.error("VideoDecoder.configure failed:", configureErr.message);
      console.error("Config:", {
        codec,
        descLen: description?.length,
        codedWidth,
        codedHeight,
      });
      throw configureErr;
    }
  }

  private handleFrame(frame: VideoFrame): void {
    const currentFrame = this.decodeStartFrame + this.decodedCount;
    this.decodedCount++;

    if (currentFrame < this.targetFrame) {
      frame.close();
      return;
    }

    if (currentFrame === this.targetFrame) {
      this.mp4file.stop();
      this.addToCache(currentFrame, frame);
      console.log("FrameReader: decoded frame", currentFrame, "(", frame.displayWidth, "x", frame.displayHeight, ")");
      this.pendingResolve?.(frame);
      this.pendingResolve = null;
      return;
    }

    // Past target — cache and stop extraction when window is full
    if (
      currentFrame < this.targetFrame + this.cacheSize &&
      !this.frameCache.has(currentFrame)
    ) {
      this.addToCache(currentFrame, frame);
    } else {
      frame.close();
    }

    if (this.decodedCount >= this.cacheSize + (this.targetFrame - this.decodeStartFrame)) {
      this.mp4file.stop();
    }
  }

  private findNearestKeyframe(target: number): number {
    // Linear scan backward through keyframeIndices (they're sorted)
    const kfs = this.metadata.keyframeIndices;
    let best = 0;
    for (const kf of kfs) {
      if (kf <= target) best = kf;
      else break;
    }
    return best;
  }

  private addToCache(frameIndex: number, frame: VideoFrame): void {
    // Evict farthest frame if cache is full
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
    this.mp4file.stop();
    for (const frame of this.frameCache.values()) {
      frame.close();
    }
    this.frameCache.clear();
    if (this.decoder && this.decoder.state !== "closed") {
      this.decoder.close();
    }
    this.decoder = null;
  }
}

function uppercaseCodec(codec: string): string {
  // "avc1.64001f" → "avc1.64001F" (only hex part is case-sensitive in WebCodecs)
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
    "Could not extract codec description from MP4. Supported codecs: AVC (avcC), HEVC (hvcC)",
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

  let totalSize =
    6 + // header (version, profile, compat, level, lenSize byte, numSPS byte)
    1; // numPPS byte
  for (let i = 0; i < numSPS; i++) totalSize += 2 + spsList[i].length;
  for (let i = 0; i < numPPS; i++) totalSize += 2 + ppsList[i].length;

  const buf = new Uint8Array(totalSize);
  let off = 0;
  buf[off++] = version;
  buf[off++] = profile;
  buf[off++] = compat;
  buf[off++] = level;
  buf[off++] = 0xfc | lenSize; // 6 reserved bits + lengthSizeMinusOne (2 bits)
  buf[off++] = 0xe0 | (numSPS & 0x1f); // 3 reserved bits + numSPS (5 bits)
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
