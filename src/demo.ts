// Explicit synthetic preview only. This transport never calls the network.
import type { Assignment, Notice, Preference, Team } from "./api";
import { randomUUID } from "expo-crypto";
export const demoEnabled = process.env.EXPO_PUBLIC_DEMO === "true";
const teamID = "11111111-1111-4111-8111-111111111111",
  memberID = "22222222-2222-4222-8222-222222222222",
  otherID = "33333333-3333-4333-8333-333333333333";
const teams: Team[] = [
  { id: teamID, name: "敬拜團契", memberId: memberID, canManage: false },
];
const start = new Date();
start.setDate(start.getDate() + (7 - start.getDay() || 7));
start.setHours(9, 0, 0, 0);
const initial: Assignment = {
  id: "44444444-4444-4444-8444-444444444444",
  teamId: teamID,
  teamName: "敬拜團契",
  meetingId: "55555555-5555-4555-8555-555555555555",
  meetingName: "主日聚會",
  occurrenceId: "66666666-6666-4666-8666-666666666666",
  occurrenceDate: start.toISOString().slice(0, 10),
  label: "詩歌主領",
  assigneeMemberId: memberID,
  assigneeName: "陳以恩",
  startsAt: start.toISOString(),
  endsAt: new Date(start.getTime() + 3600000).toISOString(),
  timeZone: "Asia/Taipei",
  version: 1,
  meetingVersion: 1,
  cancelled: false,
  helpOpen: false,
  helpRecipients: 1,
  needsAttention: false,
};
const candidates = [
  { id: memberID, name: "陳以恩" },
  { id: otherID, name: "林恩庭" },
  { id: "77777777-7777-4777-8777-777777777777", name: "王品安" },
  { id: "88888888-8888-4888-8888-888888888888", name: "張詠晴" },
];
const assignments = [0, 1, 2, 3].map((week): Assignment => {
  const date = new Date(start.getTime() + week * 7 * 86400000);
  return {
    ...initial,
    id: week ? `44444444-4444-4444-8444-44444444444${week}` : initial.id,
    startsAt: date.toISOString(),
    endsAt: new Date(date.getTime() + 3600000).toISOString(),
    occurrenceDate: date.toISOString().slice(0, 10),
    label:
      week === 1 ? "詩歌伴唱" : week === 2 ? "主日敬拜・鋼琴配搭" : "詩歌主領",
    assigneeMemberId: week === 1 ? otherID : memberID,
    assigneeName: week === 1 ? "林恩庭" : "陳以恩",
    ...(week === 1
      ? {
          request: {
            id: "99999999-9999-4999-8999-999999999999",
            mode: "nominated",
            requesterMemberId: otherID,
            targetMemberId: memberID,
            status: "active",
            createdAt: new Date().toISOString(),
          },
        }
      : {}),
  };
});
const notices: Notice[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    assignmentId: assignments[1].id,
    kind: "request",
    createdAt: new Date().toISOString(),
  },
];
let preference: Preference = {
  enabled: true,
  leadDays: 1,
  localTime: "20:00",
  timeZone: "Asia/Taipei",
  version: 1,
};
export const demoFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input)),
    path = url.pathname;
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  let data: unknown;
  let status = 200;
  if (path === "/api/account/v1/me")
    data = { id: memberID, email: "yien@example.com", nickname: "陳以恩" };
  else if (path.endsWith("/teams")) data = teams;
  else if (path.endsWith("/candidates")) data = candidates;
  else if (path.endsWith("/commands")) {
    const index = assignments.findIndex((a) => path.includes(a.id));
    let assignment = assignments[index];
    if (!assignment) return new Response("{}", { status: 404 });
    if (body.expectedVersion !== assignment.version) {
      status = 412;
      data = { error_code: "service_version_conflict" };
    } else {
      const now = new Date().toISOString();
      if (body.action === "request" || body.action === "switch")
        assignment = {
          ...assignment,
          request: {
            id: randomUUID(),
            mode: body.mode,
            targetMemberId: body.targetMemberId,
            requesterMemberId: memberID,
            status: "active",
            createdAt: now,
          },
        };
      if (body.action === "withdraw" && assignment.request)
        assignment = {
          ...assignment,
          request: {
            ...assignment.request,
            status: "withdrawn",
            closedAt: now,
          },
        };
      if (body.action === "help")
        assignment = { ...assignment, helpOpen: true };
      if (
        (body.action === "accept" || body.action === "decline") &&
        assignment.request
      ) {
        assignment = {
          ...assignment,
          request: {
            ...assignment.request,
            status: body.action === "accept" ? "accepted" : "declined",
            closedAt: now,
          },
          ...(body.action === "accept"
            ? {
                assigneeMemberId: memberID,
                assigneeName: "陳以恩",
                helpOpen: false,
              }
            : {}),
        };
      }
      assignment = { ...assignment, version: assignment.version + 1 };
      assignments[index] = assignment;
      data = assignment;
    }
  } else if (path.endsWith("/assignments"))
    data = {
      items: assignments.filter(
        (a) =>
          (!url.searchParams.get("from") ||
            a.startsAt >= url.searchParams.get("from")!) &&
          (!url.searchParams.get("to") ||
            a.startsAt < url.searchParams.get("to")!),
      ),
    };
  else if (path.includes("/assignments/"))
    data = assignments.find((a) => path.endsWith(a.id));
  else if (path.endsWith("/preference")) {
    if (body) preference = { ...body, version: preference.version + 1 };
    data = preference;
  } else if (path.endsWith("/notifications")) data = notices;
  else if (path.endsWith("/read")) {
    const n = notices.find((n) => path.includes(n.id));
    if (n) n.readAt = new Date().toISOString();
    data = { ok: true };
  } else {
    status = 404;
    data = { error_code: "demo_route_not_found" };
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};
// Session exchange stays local and uses the same explicit sign-in/refresh path.
export const demoTokenFetch: typeof fetch = async () =>
  new Response(
    JSON.stringify({
      access_token: "synthetic-demo-access",
      refresh_token: "synthetic-demo-refresh",
      expires_in: 86400,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
