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
  resolve: (f: VideoFrame) => void;
  reject: (e: Error) => void;
};

export class FrameReader {
  private decoder: VideoDecoder | null = null;
  private samples: MP4Box.Sample[];
  private buf: ArrayBuffer;
  private cache = new Map<number, VideoFrame>();
  private readonly maxCache = 90;
  public readonly metadata: FrameMetadata;

  private active: {
    start: number;
    end: number;
    count: number;
    waiters: Map<number, Waiter>;
  } | null = null;

  private constructor(m: FrameMetadata, s: MP4Box.Sample[], b: ArrayBuffer) {
    this.metadata = m;
    this.samples = s;
    this.buf = b;
  }

  static async init(buffer: ArrayBuffer): Promise<FrameReader> {
    const arrBuf = buffer as ArrayBuffer;
    arrBuf.fileStart = 0;

    const mp4 = MP4Box.createFile();
    const ready = new Promise<{ m: FrameMetadata; s: MP4Box.Sample[] }>((resolve, reject) => {
      mp4.onReady = (info) => {
        const vt = info.videoTracks[0];
        if (!vt) return reject(new Error("No video track"));
        const samples = mp4.getTrackSamplesInfo(vt.id);
        const kfs = samples.filter((s) => s.is_sync).map((s) => s.number);
        resolve({
          m: {
            codec: vt.codec.replace(/\.(.+)$/, (_, h) => "." + h.toUpperCase()),
            codedWidth: vt.video?.width ?? vt.track_width,
            codedHeight: vt.video?.height ?? vt.track_height,
            fps: vt.nb_samples / (vt.samples_duration / vt.timescale),
            totalFrames: vt.nb_samples,
            keyframeIndices: kfs,
            timescale: vt.timescale,
            description: buildAVCC(mp4),
          },
          s: samples,
        });
      };
      mp4.onError = (_s, msg) => reject(new Error("mp4box: " + msg));
    });

    mp4.appendBuffer(arrBuf);
    mp4.flush();
    const { m, s } = await ready;
    return new FrameReader(m, s, buffer);
  }

  async getFrame(i: number): Promise<VideoFrame> {
    if (i < 0 || i >= this.metadata.totalFrames) {
      throw new Error(`Frame ${i} out of range 0–${this.metadata.totalFrames - 1}`);
    }

    const cached = this.cache.get(i);
    if (cached) {
      this.cache.delete(i);
      this.cache.set(i, cached);
      return cached;
    }

    if (this.active) {
      if (i >= this.active.start && i <= this.active.end) {
        return new Promise((resolve, reject) => {
          this.active!.waiters.set(i, { resolve, reject });
        });
      }
      this.abort();
    }

    const kf = this.findKeyframe(i);
    const end = Math.min(i + this.maxCache, this.metadata.totalFrames - 1);

    return new Promise<VideoFrame>((resolve, reject) => {
      this.active = { start: kf, end, count: 0, waiters: new Map([[i, { resolve, reject }]]) };
      this.ensureDecoder();
      this.feed(kf, end);
      this.decoder!.flush().catch(() => {});
    });
  }

  close(): void {
    this.active = null;
    for (const f of this.cache.values()) f.close();
    this.cache.clear();
    if (this.decoder) try { this.decoder.close(); } catch {}
    this.decoder = null;
  }

  // ---- private ----

  private ensureDecoder(): void {
    if (this.decoder?.state === "configured") return;
    if (this.decoder) try { this.decoder.close(); } catch {}

    const { codec, codedWidth, codedHeight, description } = this.metadata;
    this.decoder = new VideoDecoder({
      output: (f) => this.onFrame(f),
      error: (e) => {
        this.abort(new Error("VideoDecoder: " + e.message));
      },
    });
    this.decoder.configure({ codec, description, codedWidth, codedHeight });
  }

  private feed(from: number, to: number): void {
    const ts = this.metadata.timescale;
    for (let i = from; i <= to; i++) {
      const s = this.samples[i];
      if (!s?.offset || !s.size) continue;
      const chunk = new EncodedVideoChunk({
        type: s.is_sync ? "key" : "delta",
        timestamp: Math.round((s.cts / ts) * 1_000_000),
        duration: Math.round((s.duration / ts) * 1_000_000),
        data: new Uint8Array(this.buf, s.offset, s.size),
      });
      try { this.decoder!.decode(chunk); } catch {}
    }
  }

  private onFrame(frame: VideoFrame): void {
    const a = this.active;
    if (!a) { frame.close(); return; }

    const idx = a.start + a.count++;
    const w = a.waiters.get(idx);
    const inWindow = idx <= a.end;
    const alreadyCached = this.cache.has(idx);

    if (inWindow && !alreadyCached) {
      this.addToCache(idx, frame);
    }

    if (w) {
      const cached = this.cache.get(idx);
      if (cached !== frame) frame.close();
      w.resolve(cached ?? frame);
      a.waiters.delete(idx);
    } else if (!inWindow || alreadyCached) {
      frame.close();
    }

    if (a.waiters.size === 0 && idx >= a.end) this.active = null;
  }

  private abort(err?: Error): void {
    const a = this.active;
    this.active = null;
    if (a) {
      for (const w of a.waiters.values()) w.reject(err ?? new Error("Aborted"));
    }
    if (this.decoder?.state === "configured") {
      try { this.decoder.close(); } catch {}
      this.decoder = null;
    }
  }

  private findKeyframe(target: number): number {
    const kfs = this.metadata.keyframeIndices;
    for (let i = kfs.length - 1; i >= 0; i--) {
      if (kfs[i] <= target) return kfs[i];
    }
    return 0;
  }

  private addToCache(i: number, frame: VideoFrame): void {
    if (this.cache.size >= this.maxCache) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.get(oldest)?.close();
        this.cache.delete(oldest);
      }
    }
    this.cache.set(i, frame);
  }
}

function buildAVCC(mp4: MP4Box.ISOFile): Uint8Array {
  const avcC = mp4.getBox("avcC") as Record<string, unknown> | undefined;
  if (!avcC) throw new Error("No avcC box — only AVC/H.264 MP4 supported");

  const sps: ArrayLike<{ data: Uint8Array; length: number }> = avcC.SPS as any;
  const pps: ArrayLike<{ data: Uint8Array; length: number }> = avcC.PPS as any;
  const nSPS = sps?.length ?? 0;
  const nPPS = pps?.length ?? 0;

  let size = 7;
  for (let i = 0; i < nSPS; i++) size += 2 + sps[i].length;
  for (let i = 0; i < nPPS; i++) size += 2 + pps[i].length;

  const b = new Uint8Array(size);
  let o = 0;
  b[o++] = (avcC.configurationVersion as number) ?? 1;
  b[o++] = (avcC.AVCProfileIndication as number) ?? 0;
  b[o++] = (avcC.profile_compatibility as number) ?? 0;
  b[o++] = (avcC.AVCLevelIndication as number) ?? 0;
  b[o++] = 0xfc | (((avcC.lengthSizeMinusOne as number) ?? 3) & 0x03);
  b[o++] = 0xe0 | (nSPS & 0x1f);

  for (let i = 0; i < nSPS; i++) {
    const len = sps[i].length;
    b[o++] = (len >> 8) & 0xff;
    b[o++] = len & 0xff;
    b.set(sps[i].data, o);
    o += len;
  }

  b[o++] = nPPS & 0xff;
  for (let i = 0; i < nPPS; i++) {
    const len = pps[i].length;
    b[o++] = (len >> 8) & 0xff;
    b[o++] = len & 0xff;
    b.set(pps[i].data, o);
    o += len;
  }

  return b;
}
