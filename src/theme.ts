// Mobile owns its visual language; rose remains the link to the HHC brand.
export const light = {
  canvas: "#f5f6f8",
  surface: "#ffffff",
  text: "#242c35",
  muted: "#6b7480",
  line: "#e6e9ed",
  primary: "#a44740",
  soft: "#f7e9e6",
  success: "#386653",
  successSoft: "#e9f1ed",
  onPrimary: "#ffffff",
  feature: "#27343d",
  featureText: "#ffffff",
  featureMuted: "#c6d0d5",
  featureAccent: "#f2b5a8",
  featureLine: "#45515a",
};
export const dark: typeof light = {
  canvas: "#141b21",
  surface: "#202a33",
  text: "#f0f3f5",
  muted: "#adb8c1",
  line: "#33404b",
  primary: "#efaba1",
  soft: "#442e2b",
  success: "#afd4be",
  successSoft: "#263c30",
  onPrimary: "#2e1b18",
  feature: "#2a3943",
  featureText: "#ffffff",
  featureMuted: "#c6d0d5",
  featureAccent: "#f2b5a8",
  featureLine: "#485963",
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
  title: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: "600" as const,
    letterSpacing: -0.5,
  },
  heading: { fontSize: 19, lineHeight: 28, fontWeight: "600" as const },
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
