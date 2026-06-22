export function frameToTimecode(frame: number, fps: number): string {
  const sec = Math.floor(frame / fps);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function frameToTimecodeMs(frame: number, fps: number): string {
  const totalMs = Math.round((frame / fps) * 1000);
  const m = Math.floor(totalMs / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function timecodeToFrame(tc: string, fps: number): number {
  const parts = tc.trim().split(":");
  let minutes = 0;
  let seconds: number;
  let millis = 0;

  if (parts.length === 1) {
    const secParts = parts[0].split(".");
    seconds = parseInt(secParts[0], 10);
    millis = secParts[1]
      ? parseInt(secParts[1].padEnd(3, "0").slice(0, 3), 10)
      : 0;
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    const secParts = parts[1].split(".");
    seconds = parseInt(secParts[0], 10);
    millis = secParts[1]
      ? parseInt(secParts[1].padEnd(3, "0").slice(0, 3), 10)
      : 0;
  } else {
    return NaN;
  }

  if (isNaN(minutes) || isNaN(seconds) || isNaN(millis)) return NaN;

  const totalSeconds = minutes * 60 + seconds + millis / 1000;
  return Math.round(totalSeconds * fps);
}

export function frameDurationSec(
  start: number,
  stop: number,
  fps: number,
): string {
  return ((stop - start + 1) / fps).toFixed(1);
}
