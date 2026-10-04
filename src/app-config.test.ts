import { afterEach, expect, it, vi } from "vitest";
import configure from "../app.config";
import type { ConfigContext } from "expo/config";
const context = {
  config: {
    name: "HHC 教會",
    slug: "hhc-app",
    android: {
      package: "tw.org.alive.hhcapp",
      predictiveBackGestureEnabled: true,
    },
    ios: { bundleIdentifier: "tw.org.alive.hhcapp" },
  },
} as ConfigContext;
afterEach(() => vi.unstubAllEnvs());
it("isolates the Android demo install without changing production or iOS identifiers", () => {
  vi.stubEnv("EAS_BUILD_PROFILE", "");
  vi.stubEnv("EXPO_PUBLIC_DEMO", "true");
  expect(configure(context).android?.package).toBe("tw.org.alive.hhcapp.demo");
  expect(configure(context).ios?.bundleIdentifier).toBe("tw.org.alive.hhcapp");
  vi.stubEnv("EXPO_PUBLIC_DEMO", "false");
  expect(configure(context).android?.package).toBe("tw.org.alive.hhcapp");
});
it("still rejects a synthetic demo in the EAS distribution pipeline", () => {
  vi.stubEnv("EAS_BUILD_PROFILE", "preview");
  vi.stubEnv("EXPO_PUBLIC_DEMO", "true");
  expect(() => configure(context)).toThrow(
    "Synthetic demo cannot be used in a signed build",
  );
});
