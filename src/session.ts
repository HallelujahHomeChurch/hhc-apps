export type Tokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};
export type Session = Tokens & { expiresAt: number };
export class AuthError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
export type SecretStorage = {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  clear(): Promise<void>;
};
export class Sessions {
  private value: Session | null = null;
  private epoch = 0;
  private refreshing: Promise<string> | null = null;
  private storageWrites: Promise<void> = Promise.resolve();
  constructor(
    private readonly storage: SecretStorage,
    private readonly tokenURL: string,
    private readonly clientID: string,
    private readonly deviceID: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  get current() {
    return this.value;
  }
  get revision() {
    return this.epoch;
  }
  private write(operation: () => Promise<void>) {
    this.storageWrites = this.storageWrites.catch(() => {}).then(operation);
    return this.storageWrites;
  }
  async restore() {
    const epoch = this.epoch;
    const raw = await this.storage.get();
    if (epoch !== this.epoch) return;
    if (raw) {
      try {
        const value = JSON.parse(raw) as Session;
        if (
          typeof value.refresh_token === "string" &&
          typeof value.access_token === "string" &&
          Number.isFinite(value.expiresAt)
        )
          this.value = value;
        else await this.signOut();
      } catch {
        await this.signOut();
      }
    }
  }
  private async exchange(body: Record<string, string>): Promise<Tokens> {
    const res = await this.fetcher(this.tokenURL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        ...body,
        client_id: this.clientID,
        device_id: this.deviceID,
        device_name: "HHC App",
      }).toString(),
    });
    const data = await res.json();
    if (!res.ok)
      throw new AuthError(
        res.status,
        typeof data.error === "string" ? data.error : "server_error",
      );
    if (
      typeof data.access_token !== "string" ||
      typeof data.refresh_token !== "string" ||
      !Number.isFinite(data.expires_in) ||
      data.expires_in <= 0
    )
      throw new AuthError(503, "invalid_token_response");
    return data;
  }
  private async save(tokens: Tokens, epoch: number) {
    if (epoch !== this.epoch) throw new AuthError(401, "session_changed");
    this.value = {
      ...tokens,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
    const saved = JSON.stringify(this.value);
    await this.write(() => this.storage.set(saved));
    return tokens.access_token;
  }
  async finish(code: string, verifier: string, redirectURI: string) {
    const epoch = ++this.epoch;
    return this.save(
      await this.exchange({
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
        redirect_uri: redirectURI,
      }),
      epoch,
    );
  }
  async access(force = false) {
    if (!this.value) throw new AuthError(401, "login_required");
    if (!force && this.value.expiresAt > Date.now() + 60_000)
      return this.value.access_token;
    if (this.refreshing) return this.refreshing;
    const epoch = this.epoch;
    const refresh = this.value.refresh_token;
    const pending = this.exchange({
      grant_type: "refresh_token",
      refresh_token: refresh,
    })
      .then((v) => this.save(v, epoch))
      .catch(async (e) => {
        if (
          e instanceof AuthError &&
          e.code === "invalid_grant" &&
          epoch === this.epoch
        )
          await this.signOut();
        throw e;
      });
    this.refreshing = pending;
    try {
      return await pending;
    } finally {
      if (this.refreshing === pending) this.refreshing = null;
    }
  }
  async signOut() {
    ++this.epoch;
    this.value = null;
    this.refreshing = null;
    await this.write(() => this.storage.clear());
  }
}
