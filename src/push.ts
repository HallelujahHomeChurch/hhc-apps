import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as Notifications from "expo-notifications";
import type { serviceAPI } from "./api";
type API = ReturnType<typeof serviceAPI>;
type Installation = { id: string; secret: string };
async function installation(): Promise<Installation> {
  const value = await SecureStore.getItemAsync("push-installation");
  if (value) {
    const parsed = JSON.parse(value) as Installation;
    if (typeof parsed.id === "string" && typeof parsed.secret === "string")
      return parsed;
  }
  const next = {
    id: Crypto.randomUUID(),
    secret: Crypto.randomUUID() + Crypto.randomUUID(),
  };
  await SecureStore.setItemAsync("push-installation", JSON.stringify(next));
  return next;
}
export async function registerPush(api: API, ask = false): Promise<string> {
  if (Platform.OS === "web") return "請在手機 App 啟用通知";
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return "此測試版本尚未設定推播";
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", {
      name: "服事通知",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && ask)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    await revokePush(api);
    return "未允許通知，可到手機設定變更";
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.installation({
    ...(await installation()),
    platform: Platform.OS,
    token: token.data,
  });
  return "已啟用";
}
export async function revokePush(api: API) {
  if (Platform.OS === "web") return;
  const raw = await SecureStore.getItemAsync("push-installation");
  if (raw) await api.installation({ ...JSON.parse(raw), revoke: true });
}
