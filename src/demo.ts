// Explicit synthetic preview only. This transport never calls the network.
import type { Assignment, Preference, Team } from "./api";
export const demoEnabled = process.env.EXPO_PUBLIC_DEMO === "true";
const teamID = "11111111-1111-4111-8111-111111111111",
  memberID = "22222222-2222-4222-8222-222222222222",
  otherID = "33333333-3333-4333-8333-333333333333";
const teams: Team[] = [
  { id: teamID, name: "敬拜團契", memberId: memberID, canManage: false },
];
const start = new Date(Date.now() + 3 * 86400000);
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
  assigneeName: "測試同工",
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
let assignment = { ...initial };
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
  if (path.endsWith("/teams")) data = teams;
  else if (path.endsWith("/candidates"))
    data = [
      { id: memberID, name: "測試同工" },
      { id: otherID, name: "示範同工" },
    ];
  else if (path.endsWith("/commands")) {
    if (body.expectedVersion !== assignment.version) {
      status = 412;
      data = { error_code: "service_version_conflict" };
    } else {
      const now = new Date().toISOString();
      if (body.action === "request" || body.action === "switch")
        assignment = {
          ...assignment,
          request: {
            id: crypto.randomUUID(),
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
      assignment = { ...assignment, version: assignment.version + 1 };
      data = assignment;
    }
  } else if (path.endsWith("/assignments")) data = { items: [assignment] };
  else if (path.includes("/assignments/")) data = assignment;
  else if (path.endsWith("/preference")) {
    if (body) preference = { ...body, version: preference.version + 1 };
    data = preference;
  } else if (path.endsWith("/notifications")) data = [];
  else {
    status = 404;
    data = { error_code: "demo_route_not_found" };
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};
export const demoSession = JSON.stringify({
  access_token: "synthetic-demo-access",
  refresh_token: "synthetic-demo-refresh",
  expires_in: 86400,
  expiresAt: Date.now() + 86400000,
});
