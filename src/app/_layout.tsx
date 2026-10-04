import React from "react";
import { useColorScheme } from "react-native";
import {
  Stack,
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
  usePathname,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ServiceProvider, useService } from "../service-state";
import { Brand } from "../service-ui";
export const unstable_settings = { anchor: "(tabs)" };
function Navigation() {
  const { colors, signed } = useService();
  const path = usePathname();
  const title = !signed
    ? ""
    : path === "/service"
      ? "服事"
      : path === "/notifications"
        ? "通知"
        : path === "/profile"
          ? "我的"
          : "HHC";
  const theme = useColorScheme() === "dark" ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...theme,
        colors: {
          ...theme.colors,
          primary: colors.primary,
          background: colors.canvas,
          card: colors.canvas,
          text: colors.text,
          border: colors.line,
          notification: colors.primary,
        },
      }}
    >
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: "600",
            fontSize: 17,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.canvas },
          headerStyle: { backgroundColor: colors.canvas },
          headerBackTitle: "返回",
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            title,
            headerLargeTitle: false,
            headerTitle:
              signed && path === "/"
                ? () => <Brand color={colors.text} />
                : undefined,
          }}
        />
        <Stack.Screen
          name="assignment/[id]"
          options={{ title: "服事詳情", headerLargeTitle: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
export default function RootLayout() {
  return (
    <ServiceProvider>
      <Navigation />
    </ServiceProvider>
  );
}
