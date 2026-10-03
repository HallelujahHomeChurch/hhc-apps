import { Sessions, AuthError } from "./session";
import type { components } from "./generated";
export type Team = components["schemas"]["ServiceTeam"];
export type Candidate = components["schemas"]["ServiceCandidate"];
export type Replacement = components["schemas"]["ServiceReplacement"];
export type Assignment = components["schemas"]["ServiceAssignment"];
export type Preference = components["schemas"]["ServicePreference"];
export type Notice = components["schemas"]["ServiceNotice"];
export class APIError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
export function serviceAPI(
  base: string,
  sessions: Sessions,
  onDenied: () => void,
  fetcher: typeof fetch = fetch,
) {
  async function request<T>(
    path: string,
    body?: unknown,
    key?: string,
  ): Promise<T> {
    const epoch = sessions.revision;
    let token: string;
    try {
      token = await sessions.access();
    } catch (e) {
      if (!sessions.current) onDenied();
      throw e;
    }
    const send = () =>
      fetcher(base + "/api/operations/me/service" + path, {
        signal: AbortSignal.timeout(15000),
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    let res = await send();
    if (res.status === 401) {
      try {
        token = await sessions.access(true);
      } catch (e) {
        if (!sessions.current) onDenied();
        throw e;
      }
      res = await send();
    }
    if (epoch !== sessions.revision)
      throw new AuthError(401, "session_changed");
    if (!res.ok) {
      if ([401, 403, 404].includes(res.status)) onDenied();
      const data = await res.json().catch(() => ({}));
      throw new APIError(res.status, data.error_code || "request_failed");
    }
    const data = await res.json();
    if (epoch !== sessions.revision)
      throw new AuthError(401, "session_changed");
    return data;
  }
  return {
    installation: (body: {
      id: string;
      secret: string;
      token?: string;
      platform?: string;
      revoke?: boolean;
    }) => request<{ ok: boolean }>("/installation", body),
    teams: () => request<Team[]>("/teams"),
    candidates: async (team: string) => {
      const all: Candidate[] = [];
      let cursor = "";
      for (;;) {
        const page = await request<Candidate[]>(
          "/teams/" +
            encodeURIComponent(team) +
            "/candidates?" +
            new URLSearchParams({ cursor }),
        );
        all.push(...page);
        if (page.length < 100) return all;
        const next = page.at(-1)!.id;
        if (next === cursor) throw new Error("invalid_cursor");
        cursor = next;
      }
    },
    list: (team: string, from: string, to: string, cursor = "") =>
      request<{ items: Assignment[]; nextCursor?: string }>(
        "/assignments?" +
          new URLSearchParams({ teamId: team, from, to, cursor }),
      ),
    detail: (id: string) =>
      request<Assignment>("/assignments/" + encodeURIComponent(id)),
    command: (
      a: Assignment,
      action: string,
      key: string,
      extra: Record<string, unknown> = {},
    ) =>
      request<Assignment>(
        "/assignments/" + a.id + "/commands",
        { action, expectedVersion: a.version, ...extra },
        key,
      ),
    preference: () => request<Preference>("/preference"),
    savePreference: (p: Preference) => request<Preference>("/preference", p),
    notifications: async () => {
      const all: Notice[] = [];
      let cursor = "";
      for (;;) {
        const page = await request<Notice[]>(
          "/notifications?" + new URLSearchParams({ cursor }),
        );
        all.push(...page);
        if (page.length < 100) return all;
        const next = page.at(-1)!.id;
        if (next === cursor) throw new Error("invalid_cursor");
        cursor = next;
      }
    },
    read: (id: string) => request("/notifications/" + id + "/read", {}),
  };
}
export function message(e: unknown): string {
  if (e instanceof APIError) {
    if (e.status === 412) return "資料已更新，請重新整理後再操作。";
    if (e.status === 409) return "這項請求已變更或結束，請查看最新班表。";
    if (e.status === 404) return "目前無法存取這項服事，請確認團契資格。";
  }
  if (e instanceof AuthError)
    return ["login_required", "invalid_grant", "session_changed"].includes(
      e.code,
    )
      ? "請重新登入。"
      : "登入服務暫時無法使用，請稍後重試。";
  return "連線失敗，請檢查網路後重試。";
}
