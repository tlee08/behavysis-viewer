import {
  interpolateInferno,
  interpolateMagma,
  interpolatePlasma,
  interpolateTurbo,
  interpolateViridis,
} from "d3-scale-chromatic";

export type ColorMode = "individual" | "bodypart";

export const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "bodypart", label: "Body part" },
];

export const COLOURMAP_NAMES = [
  "hue",
  "viridis",
  "plasma",
  "inferno",
  "magma",
  "turbo",
  "coolwarm",
  "tableau10",
] as const;

export type ColorMapName = (typeof COLOURMAP_NAMES)[number];

const TABLEAU10 = [
  "#4e79a7",
  "#f28e2c",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc949",
  "#af7aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ab",
];

function interpolateCoolwarm(t: number): string {
  const r =
    t < 0.5
      ? Math.round(59 + (220 - 59) * (t / 0.5))
      : Math.round(220 - (220 - 180) * ((t - 0.5) / 0.5));
  const g =
    t < 0.5
      ? Math.round(76 + (220 - 76) * (t / 0.5))
      : Math.round(220 - (220 - 119) * ((t - 0.5) / 0.5));
  const b =
    t < 0.5
      ? Math.round(192 + (220 - 192) * (t / 0.5))
      : Math.round(220 - (220 - 173) * ((t - 0.5) / 0.5));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

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

export function getColorMapColor(
  map: ColorMapName,
  i: number,
  n: number,
): string {
  const t = n <= 1 ? 0 : i / (n - 1);
  switch (map) {
    case "hue":
      return hslToHex(t * 360, 80, 55);
    case "viridis":
      return interpolateViridis(t);
    case "plasma":
      return interpolatePlasma(t);
    case "inferno":
      return interpolateInferno(t);
    case "magma":
      return interpolateMagma(t);
    case "turbo":
      return interpolateTurbo(t);
    case "coolwarm":
      return interpolateCoolwarm(t);
    case "tableau10":
      return TABLEAU10[i % TABLEAU10.length];
  }
}
