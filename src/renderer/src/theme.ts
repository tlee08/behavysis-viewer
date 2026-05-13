import { createTheme } from "@mantine/core";
import "@mantine/core/styles.css";

export const theme = createTheme({
  defaultColorScheme: "dark",

  colors: {
    dark: [
      "#e2e8f0",
      "#cbd5e1",
      "#94a3b8",
      "#64748b",
      "#475569",
      "#334155",
      "#1e293b",
      "#0f172a",
      "#020617",
      "#000000",
    ],
    blue: [
      "#eff6ff",
      "#dbeafe",
      "#bfdbfe",
      "#93c5fd",
      "#60a5fa",
      "#3b82f6",
      "#2563eb",
      "#1d4ed8",
      "#1e40af",
      "#1e3a8a",
    ],
  },

  primaryColor: "blue",
  spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
  defaultRadius: "sm",
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "monospace",
});
