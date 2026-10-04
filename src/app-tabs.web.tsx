import React from "react";
import { Tabs } from "expo-router";
import { AppIcon } from "./service-ui";
import { useService } from "./service-state";
import { labels, Tab } from "./screens";
export function AppTabs() {
  const { colors } = useService();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          minHeight: 76,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 12 },
        tabBarItemStyle: { minHeight: 52 },
        tabBarLabelPosition: "below-icon",
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      {(["home", "service", "profile"] as Tab[]).map((tab) => (
        <Tabs.Screen
          key={tab}
          name={tab === "home" ? "index" : tab}
          options={{
            title: labels[tab],
            tabBarIcon: ({ color }) => (
              <AppIcon name={tab} color={String(color)} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
