// HHC's existing rose identity, with quiet neutral surfaces for everyday tasks.
export const light = {
  canvas: "#f6f5f2",
  surface: "#ffffff",
  text: "#292825",
  muted: "#716d68",
  line: "#e6e3df",
  primary: "#963e35",
  soft: "#f4e7e3",
  success: "#386653",
  successSoft: "#e9f1ed",
  onPrimary: "#ffffff",
};
export const dark: typeof light = {
  canvas: "#1a1b1a",
  surface: "#252725",
  text: "#f4f2ee",
  muted: "#b8b6b0",
  line: "#3b3e3b",
  primary: "#efaba1",
  soft: "#442e2b",
  success: "#afd4be",
  successSoft: "#263c30",
  onPrimary: "#2e1b18",
};
export type Palette = typeof light;
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  page: 24,
  xl: 32,
  xxl: 40,
};
export const type = {
  title: { fontSize: 30, lineHeight: 39, fontWeight: "700" as const },
  heading: { fontSize: 20, lineHeight: 29, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 25 },
  small: { fontSize: 14, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 18 },
  numeral: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "500" as const,
    fontVariant: ["tabular-nums"] as ["tabular-nums"],
  },
};
