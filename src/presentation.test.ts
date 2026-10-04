import { describe, expect, it } from "vitest";
import {
  clockDate,
  clockValue,
  formatDate,
  formatRange,
  reminderSummary,
  validPreference,
  zoneOptions,
} from "./presentation";
import { systemPath } from "./navigation";
const preference = {
  enabled: true,
  leadDays: 1,
  localTime: "20:00",
  timeZone: "Asia/Taipei",
  version: 1,
};
describe("reminder controls and timezone presentation", () => {
  it("preserves the selected wall clock, including midnight and minute precision", () => {
    for (const time of ["00:00", "08:05", "20:00", "23:59"])
      expect(clockValue(clockDate(time))).toBe(time);
    expect(reminderSummary(preference)).toBe("前一天 20:00・台北時間");
  });
  it("retains uncommon saved zones and rejects invalid settings", () => {
    expect(zoneOptions("Pacific/Chatham")).toContain("Pacific/Chatham");
    expect(
      validPreference({
        ...preference,
        timeZone: "Pacific/Chatham",
        leadDays: 0,
      }),
    ).toBe(true);
    for (const edit of [
      { timeZone: "not/a-zone" },
      { leadDays: -1 },
      { leadDays: 1.5 },
      { leadDays: 8 },
      { localTime: "24:00" },
      { localTime: "08:60" },
    ])
      expect(validPreference({ ...preference, ...edit })).toBe(false);
  });
  it("formats the same assignment in the chosen zone across a day boundary", () => {
    const date = "2026-10-04T01:00:00Z";
    expect(formatDate(date, "Asia/Taipei")).toContain("10/4");
    expect(formatDate(date, "America/Los_Angeles")).toContain("10/3");
    expect(formatRange(Date.parse("2026-12-20T00:00:00Z"), "UTC")).toBe(
      "2026/12/20 – 2027/1/18",
    );
  });
});
describe("existing notification and OAuth links", () => {
  const id = "44444444-4444-4444-8444-444444444444";
  it("keeps existing service targets and strips OAuth callback parameters", () => {
    expect(systemPath(`hhc-app://service/${id}`)).toBe(`/assignment/${id}`);
    expect(systemPath(`/service/${id}`)).toBe(`/assignment/${id}`);
    expect(
      systemPath("hhc-app://auth/account?code=not-a-real-code&state=abc"),
    ).toBe("/");
    expect(systemPath(`/assignment/${id}`)).toBe(`/assignment/${id}`);
  });
});
