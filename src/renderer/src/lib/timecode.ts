export function frameToTimecode(frame: number, fps: number): string {
  const sec = Math.floor(frame / fps);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function frameDurationSec(
  start: number,
  stop: number,
  fps: number,
): string {
  return ((stop - start + 1) / fps).toFixed(1);
}
