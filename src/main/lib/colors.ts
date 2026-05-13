/** Generate N visually distinct hex colours using HSL spacing. */
export function generateColors(n: number): string[] {
  if (n === 0) return [];
  return Array.from({ length: n }, (_, i) => {
    const hue = Math.round((i / n) * 360);
    return hslToHex(hue, 80, 55);
  });
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lN - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
