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

describe("explicit login lifecycle", () => {
  function fresh(failSave = false) {
    let stored: string | null = null;
    const storage = {
      get: async () => stored,
      set: async (value: string) => {
        if (failSave) throw new Error("storage_unavailable");
        stored = value;
      },
      clear: async () => {
        stored = null;
      },
    };
    const create = () =>
      new Sessions(
        storage,
        "https://account.test/token",
        "hhc-app",
        "device",
        async () => new Response(JSON.stringify(token)),
      );
    return { create, stored: () => stored };
  }
  it("requires sign-in, restores a saved session, and stays signed out after logout", async () => {
    const { create, stored } = fresh();
    const session = create();
    await session.restore();
    expect(session.current).toBeNull();
    await expect(session.access()).rejects.toThrow("login_required");
    await session.finish("code", "verifier", "hhc-app://auth/account");
    const restored = create();
    await restored.restore();
    expect(await restored.access()).toBe("access");
    await restored.signOut();
    expect(stored()).toBeNull();
    const reopened = create();
    await reopened.restore();
    expect(reopened.current).toBeNull();
  });
  it("does not authenticate when storing the credentials fails", async () => {
    const { create } = fresh(true);
    const session = create();
    await expect(
      session.finish("code", "verifier", "hhc-app://auth/account"),
    ).rejects.toThrow("storage_unavailable");
    expect(session.current).toBeNull();
  });
});
