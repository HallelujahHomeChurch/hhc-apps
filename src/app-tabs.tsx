import React from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useService } from "./service-state";
export function AppTabs() {
  const { colors, notices } = useService();
  const unread = notices.filter((n) => !n.readAt).length;
  return (
    <NativeTabs
      tintColor={colors.primary}
      minimizeBehavior="never"
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger
        name="index"
        contentStyle={{ backgroundColor: colors.canvas }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
        <NativeTabs.Trigger.Label>首頁</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="service"
        contentStyle={{ backgroundColor: colors.canvas }}
      >
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_today" />
        <NativeTabs.Trigger.Label>服事</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="notifications"
        contentStyle={{ backgroundColor: colors.canvas }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "bell", selected: "bell.fill" }}
          md="notifications"
        />
        <NativeTabs.Trigger.Label>通知</NativeTabs.Trigger.Label>
        {unread > 0 && (
          <NativeTabs.Trigger.Badge>
            {unread > 99 ? "99+" : String(unread)}
          </NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="profile"
        contentStyle={{ backgroundColor: colors.canvas }}
      >
        <NativeTabs.Trigger.Icon
          sf={{
            default: "person.crop.circle",
            selected: "person.crop.circle.fill",
          }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>我的</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
