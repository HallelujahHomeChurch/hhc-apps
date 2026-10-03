import { describe, it, expect, vi } from "vitest";
import { serviceAPI, APIError } from "./api";
import { Sessions } from "./session";
async function session() {
  const s = new Sessions(
    {
      get: async () =>
        JSON.stringify({
          access_token: "synthetic-access",
          refresh_token: "synthetic-refresh",
          expires_in: 3600,
          expiresAt: Date.now() + 3600000,
        }),
      set: async () => {},
      clear: async () => {},
    },
    "https://test.invalid/token",
    "app",
    "device",
  );
  await s.restore();
  return s;
}
describe("authenticated service transport", () => {
  it("rejects a late response after logout", async () => {
    const s = await session();
    let resolve!: (v: Response) => void;
    vi.stubGlobal(
      "fetch",
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    );
    try {
      const api = serviceAPI("https://test.invalid", s, () => {});
      const result = api.teams();
      await Promise.resolve();
      await s.signOut();
      resolve(new Response("[]"));
      await expect(result).rejects.toThrow("session_changed");
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("clears protected caches on denied access and preserves conflict codes", async () => {
    const s = await session(),
      clear = vi.fn();
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response('{"error_code":"service_not_found"}', { status: 404 }),
    );
    try {
      const api = serviceAPI("https://test.invalid", s, clear);
      await expect(api.teams()).rejects.toBeInstanceOf(APIError);
      expect(clear).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("sends the aggregate version and idempotency key unchanged", async () => {
    const s = await session();
    let init: RequestInit | undefined;
    vi.stubGlobal("fetch", async (_: unknown, i: RequestInit) => {
      init = i;
      return new Response("{}");
    });
    try {
      const api = serviceAPI("https://test.invalid", s, () => {});
      await api.command(
        { id: "assignment", version: 8 } as Parameters<typeof api.command>[0],
        "accept",
        "stable-key",
        { requestId: "request" },
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        action: "accept",
        expectedVersion: 8,
        requestId: "request",
      });
      expect((init?.headers as Record<string, string>)["Idempotency-Key"]).toBe(
        "stable-key",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
