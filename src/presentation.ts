import type { Preference } from "./api";

const cities: Record<string, string> = {
  "Asia/Taipei": "台北",
  "Asia/Tokyo": "東京",
  "Asia/Seoul": "首爾",
  "Asia/Hong_Kong": "香港",
  "Asia/Shanghai": "上海",
  "Asia/Singapore": "新加坡",
  "Asia/Bangkok": "曼谷",
  "Australia/Sydney": "雪梨",
  "Pacific/Auckland": "奧克蘭",
  "America/Los_Angeles": "洛杉磯",
  "America/Vancouver": "溫哥華",
  "America/New_York": "紐約",
  "America/Chicago": "芝加哥",
  "America/Toronto": "多倫多",
  "Europe/London": "倫敦",
  "Europe/Paris": "巴黎",
  "Europe/Berlin": "柏林",
  UTC: "世界協調時間",
};
export function zoneLabel(zone: string) {
  return cities[zone] || zone.split("/").at(-1)!.replaceAll("_", " ");
}
export function matchesZone(zone: string, query: string) {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[\s_/-]+/g, "");
  return normalize(`${zoneLabel(zone)} ${zone}`).includes(normalize(query));
}
export function zoneOptions(current: string) {
  return [
    ...new Set([
      current,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...Object.keys(cities),
      ...(Intl.supportedValuesOf?.("timeZone") ?? []),
    ]),
  ];
}
export function dayLabel(days: number) {
  return days === 0 ? "當天" : days === 1 ? "前一天" : `提前 ${days} 天`;
}
export function formatDate(iso: string, zone: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: zone,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
export function formatRange(start: number, zone: string) {
  const date = new Intl.DateTimeFormat("zh-TW", {
    timeZone: zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  return `${date.format(start)} – ${date.format(start + 30 * 86400000 - 1)}`;
}
export function validPreference(p: Preference) {
  try {
    new Intl.DateTimeFormat("zh-TW", { timeZone: p.timeZone });
  } catch {
    return false;
  }
  return (
    Number.isInteger(p.leadDays) &&
    p.leadDays >= 0 &&
    p.leadDays <= 7 &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(p.localTime)
  );
}
export function clockDate(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes);
}
export function clockValue(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

// Calendar grouping follows the chosen display zone, never the device's local month.
export function calendarMonth(instant: number | string, zone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(instant));
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}
export function shiftMonth(month: string, offset: number) {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}
export function monthRange(month: string) {
  const [year, value] = month.split("-").map(Number);
  // Fetch a superset covering UTC-12 through UTC+14, then filter by display-zone month.
  return {
    from: new Date(Date.UTC(year, value - 1, 1) - 14 * 3600000).toISOString(),
    to: new Date(Date.UTC(year, value, 1) + 12 * 3600000).toISOString(),
  };
}
export function monthTitle(month: string) {
  const [year, value] = month.split("-").map(Number);
  return `${year}年${value}月`;
}
export function dateKey(instant: string, zone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}
