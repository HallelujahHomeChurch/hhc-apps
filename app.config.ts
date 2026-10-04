import type { ExpoConfig, ConfigContext } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.EAS_BUILD_PROFILE) {
    if (process.env.EXPO_PUBLIC_DEMO === "true")
      throw new Error("Synthetic demo cannot be used in a signed build.");
    for (const key of [
      "EXPO_PUBLIC_ACCOUNT_URL",
      "EXPO_PUBLIC_API_URL",
      "EXPO_PUBLIC_OAUTH_CLIENT_ID",
      "EXPO_PUBLIC_EAS_PROJECT_ID",
    ])
      if (!process.env[key])
        throw new Error(`Missing build configuration: ${key}`);
  }
  return {
    ...config,
    android: {
      ...config.android,
      package:
        process.env.EXPO_PUBLIC_DEMO === "true"
          ? "tw.org.alive.hhcapp.demo"
          : config.android?.package,
    },
    name: config.name || "HHC 教會",
    slug: config.slug || "hhc-app",
    extra: {
      ...config.extra,
      ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
        ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } }
        : {}),
    },
  };
};
