import React from "react";
import { Pressable, Text, View } from "react-native";
import {
  Stack,
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
  useRouter,
} from "expo-router";
import { LoginScreen } from "../screens";
import { StatusBar } from "expo-status-bar";
import { ServiceProvider, useService } from "../service-state";
import { AppIcon, Brand } from "../service-ui";
export const unstable_settings = { anchor: "(tabs)" };
function NotificationButton() {
  const { colors, notices } = useService();
  const router = useRouter();
  const unread = notices.filter((n) => !n.readAt).length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `通知，${unread} 則未讀` : "通知"}
      onPress={() => router.push("/notifications")}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <AppIcon name="notifications" color={colors.text} size={23} />
      {unread > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 4,
            right: 2,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{ color: colors.onPrimary, fontSize: 11, fontWeight: "700" }}
          >
            {unread > 99 ? "99+" : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
function Navigation() {
  const { colors, signed, mode, session } = useService();
  const theme = mode === "dark" ? DarkTheme : DefaultTheme;
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
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      {!session ? (
        <LoginScreen />
      ) : (
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
          <Stack.Protected guard={!signed}>
            <Stack.Screen
              name="login"
              options={{ headerShown: false, animation: "fade" }}
            />
          </Stack.Protected>
          <Stack.Protected guard={signed}>
            <Stack.Screen
              name="(tabs)"
              options={{
                title: "",
                headerLargeTitle: false,
                headerLeft: () => <Brand color={colors.text} />,
                unstable_headerLeftItems: () => [
                  {
                    type: "custom",
                    element: <Brand color={colors.text} />,
                    hidesSharedBackground: true,
                  },
                ],
                headerRight: () => <NotificationButton />,
              }}
            />
            <Stack.Screen name="notifications" options={{ title: "通知" }} />
            <Stack.Screen
              name="assignment/[id]"
              options={{ title: "服事詳情", headerLargeTitle: false }}
            />
          </Stack.Protected>
        </Stack>
      )}
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
