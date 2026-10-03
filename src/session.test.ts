import { describe, it, expect } from "vitest";
import { Sessions } from "./session";
const token = {
  access_token: "access",
  refresh_token: "refresh",
  expires_in: 3600,
  expiresAt: 0,
};
function setup(code: number, error: string) {
  let value: string | null = JSON.stringify(token);
  const storage = {
    get: async () => value,
    set: async (v: string) => {
      value = v;
    },
    clear: async () => {
      value = null;
    },
  };
  const session = new Sessions(
    storage,
    "https://account.test/oauth/token",
    "app",
    "device",
    async () => new Response(JSON.stringify({ error }), { status: code }),
  );
  return { session, stored: () => value };
}
describe("session recovery", () => {
  for (const status of [409, 503])
    it(`preserves credentials on ${status}`, async () => {
      const { session, stored } = setup(status, "temporarily_unavailable");
      await session.restore();
      await expect(session.access()).rejects.toThrow();
      expect(stored()).not.toBeNull();
      expect(session.current).not.toBeNull();
    });
  it("clears an invalid grant", async () => {
    const { session, stored } = setup(400, "invalid_grant");
    await session.restore();
    await expect(session.access()).rejects.toThrow();
    expect(stored()).toBeNull();
  });
  it("does not resurrect a session after sign out", async () => {
    let resolve!: (r: Response) => void;
    let value: string | null = JSON.stringify(token);
    const s = new Sessions(
      {
        get: async () => value,
        set: async (v) => {
          value = v;
        },
        clear: async () => {
          value = null;
        },
      },
      "https://test/token",
      "app",
      "device",
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    await s.restore();
    const refresh = s.access();
    await s.signOut();
    resolve(new Response(JSON.stringify(token)));
    await expect(refresh).rejects.toThrow("session_changed");
    expect(value).toBeNull();
  });
});
