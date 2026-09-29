export function frameToTimecode(frame: number, fps: number): string {
  const sec = Math.floor(frame / fps);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function frameToSeconds(frame: number, fps: number): number {
  return frame / fps;
}

export function secondsToFrame(seconds: string | number, fps: number): number {
  const n = typeof seconds === "number" ? seconds : Number(seconds.trim());
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * fps);
}

export function frameDurationSec(
  start: number,
  stop: number,
  fps: number,
): string {
  return ((stop - start + 1) / fps).toFixed(1);
}
