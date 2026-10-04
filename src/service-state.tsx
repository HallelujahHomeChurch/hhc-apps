import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { usePathname, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Notifications from "expo-notifications";
import { useAppearance } from "./use-appearance";
import { light, dark } from "./theme";
import { demoEnabled, demoFetch, demoSession } from "./demo";
import { registerPush, revokePush } from "./push";
import { Sessions } from "./session";
import {
  APIError,
  Assignment,
  Candidate,
  Notice,
  Preference,
  Team,
  message,
  serviceAPI,
} from "./api";
WebBrowser.maybeCompleteAuthSession();
const account = process.env.EXPO_PUBLIC_ACCOUNT_URL || "";
const authBase = account.replace(/\/$/, "") + "/api/account/v1";
const apiOrigin = process.env.EXPO_PUBLIC_API_URL || "";
const clientID = process.env.EXPO_PUBLIC_OAUTH_CLIENT_ID || "hhc-app";
const ready = [account, apiOrigin].every((v) => /^https:\/\//.test(v));
type API = ReturnType<typeof serviceAPI>;
function useServiceState() {
  const router = useRouter();
  const pathname = usePathname();
  const { mode, toggleAppearance } = useAppearance();
  const colors = mode === "dark" ? dark : light;
  const [session, setSession] = useState<Sessions | null>(null);
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [initializationError, setInitializationError] = useState("");
  const [stale, setStale] = useState(false);
  const [signed, setSigned] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamID, setTeamID] = useState("");
  const [items, setItems] = useState<Assignment[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [pref, setPref] = useState<Preference | null>(null);
  const [windowOffset, setWindowOffset] = useState(0);
  const [detail, setDetail] = useState<Assignment | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<number | null>(null);
  const [displayZone, setDisplayZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [permission, setPermission] = useState("未啟用");
  const detailID = useRef<string | null>(null);
  useEffect(() => {
    detailID.current = detail?.id || null;
  }, [detail]);
  const api = useRef<API | null>(null);
  const generation = useRef(0);
  const submitting = useRef(false);
  const commandKeys = useRef(new Map<string, string>());
  const loadedAt = useRef(0);
  const detailLoad = useRef(0);
  const [loadedWindow, setLoadedWindow] = useState(0);
  const [windowStart, setWindowStart] = useState(Date.now());
  const clear = useCallback((keepPreference = false) => {
    generation.current++;
    detailLoad.current++;
    setItems([]);
    setDetail(null);
    setCandidates([]);
    setNotices([]);
    setTeams([]);
    if (!keepPreference) setPref(null);
    setUpdated(null);
    setBusy(false);
    detailID.current = null;
    loadedAt.current = 0;
    commandKeys.current.clear();
  }, []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      let device =
        Platform.OS === "web"
          ? null
          : await SecureStore.getItemAsync("device-id");
      if (!device) {
        device = Crypto.randomUUID();
        if (Platform.OS !== "web")
          await SecureStore.setItemAsync("device-id", device);
      }
      let webValue: string | null = demoEnabled ? demoSession : null;
      const s = new Sessions(
        {
          get: () =>
            Platform.OS === "web" || demoEnabled
              ? Promise.resolve(webValue)
              : SecureStore.getItemAsync("session"),
          set: (v) =>
            Platform.OS === "web" || demoEnabled
              ? Promise.resolve(void (webValue = v))
              : SecureStore.setItemAsync("session", v),
          clear: () =>
            Platform.OS === "web" || demoEnabled
              ? Promise.resolve(void (webValue = null))
              : SecureStore.deleteItemAsync("session"),
        },
        authBase + "/oauth/token",
        clientID,
        device,
      );
      await s.restore();
      if (!alive) return;
      api.current = serviceAPI(
        demoEnabled ? "https://demo.invalid" : apiOrigin,
        s,
        () => {
          clear();
          setSigned(Boolean(s.current));
          setError(
            s.current
              ? "目前無法讀取這項服事，請確認團契資格。"
              : "登入已失效，請重新登入。",
          );
        },
        demoEnabled ? demoFetch : fetch,
      );
      setSession(s);
      setSigned(!!s.current);
    })().catch(() => {
      if (alive) setInitializationError("無法讀取本機登入資料，請再試一次。");
    });
    return () => {
      alive = false;
    };
  }, [clear, initializationAttempt]);
  const openDetail = useCallback(async (id: string) => {
    if (!api.current) return;
    const epoch = generation.current;
    const load = ++detailLoad.current;
    detailID.current = id;
    setCandidates([]);
    setError("");
    try {
      const a = await api.current.detail(id);
      if (epoch !== generation.current || load !== detailLoad.current) return;
      setDetail(a);
      const members = await api.current.candidates(a.teamId);
      if (epoch === generation.current && load === detailLoad.current)
        setCandidates(members);
    } catch (e) {
      if (epoch === generation.current && load === detailLoad.current)
        setError(message(e));
    }
  }, []);
  const refresh = useCallback(async () => {
    if (!api.current || !session?.current) return;
    const epoch = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const ts = await api.current.teams();
      const now = new Date(Date.now() + windowOffset * 30 * 86400000);
      const until = new Date(now.getTime() + 30 * 86400000);
      const all: Assignment[] = [];
      for (const t of ts) {
        let cursor = "";
        do {
          const page = await api.current.list(
            t.id,
            now.toISOString(),
            until.toISOString(),
            cursor,
          );
          all.push(...page.items);
          cursor = page.nextCursor || "";
        } while (cursor);
      }
      const [ns, p] = await Promise.all([
        api.current.notifications(),
        api.current.preference(),
      ]);
      if (epoch !== generation.current) return;
      setTeams(ts);
      setTeamID((old) =>
        ts.some((t) => t.id === old) ? old : ts[0]?.id || "",
      );
      setItems(
        all.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)),
      );
      setNotices(ns);
      setPref(p);
      setLoadedWindow(windowOffset);
      setWindowStart(now.getTime());
      setStale(false);
      setUpdated(Date.now());
      loadedAt.current = performance.now();
      if (detailID.current) void openDetail(detailID.current);
    } catch (e) {
      if (epoch === generation.current) {
        setStale(true);
        setError(message(e));
        if (!session.current) {
          clear();
          setSigned(false);
        }
      }
    } finally {
      if (epoch === generation.current) setBusy(false);
    }
  }, [session, clear, openDetail, windowOffset]);
  useEffect(() => {
    if (signed) void refresh();
  }, [signed, refresh]);
  useEffect(() => {
    if (!signed || !api.current || demoEnabled) return;
    let alive = true;
    void registerPush(api.current)
      .then((v) => {
        if (alive) setPermission(v);
      })
      .catch(() => {
        if (alive) setPermission("推播連線尚未完成，請重試");
      });
    const listener = Notifications.addPushTokenListener(() => {
      if (api.current) void registerPush(api.current).catch(() => {});
    });
    return () => {
      alive = false;
      listener.remove();
    };
  }, [signed]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (loadedAt.current && performance.now() - loadedAt.current >= 300000) {
        // Expire roster data without unmounting an in-progress settings draft.
        clear(true);
        if (signed && AppState.currentState === "active") void refresh();
      }
    }, 1000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active" && signed) {
        void refresh();
        if (api.current && !demoEnabled)
          void registerPush(api.current)
            .then(setPermission)
            .catch(() => {});
      }
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [clear, refresh, signed]);
  useEffect(() => {
    if (Platform.OS === "web" || demoEnabled) return;
    const handle = (r: Notifications.NotificationResponse | null) => {
      const d = r?.notification.request.content.data;
      if (
        d?.type === "service" &&
        typeof d.assignmentId === "string" &&
        /^[0-9a-f-]{36}$/i.test(d.assignmentId)
      ) {
        router.navigate({
          pathname: "/assignment/[id]",
          params: { id: d.assignmentId },
        });
      }
    };
    void Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => setError("無法開啟推播通知，請到通知頁查看。"));
    const listener =
      Notifications.addNotificationResponseReceivedListener(handle);
    return () => listener.remove();
  }, [router]);
  async function login() {
    if (!session || !ready) return;
    const destination = pathname.match(/^\/assignment\/([0-9a-f-]{36})$/i)?.[1];
    setBusy(true);
    setError("");
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "hhc-app",
        path: "auth/account",
      });
      const request = new AuthSession.AuthRequest({
        clientId: clientID,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        scopes: ["openid", "profile"],
        usePKCE: true,
      });
      const result = await request.promptAsync({
        authorizationEndpoint: authBase + "/oauth/authorize",
      });
      if (
        result.type === "success" &&
        result.params.code &&
        request.codeVerifier
      ) {
        await session.finish(
          result.params.code,
          request.codeVerifier,
          redirectUri,
        );
        clear();
        setSigned(true);
        if (destination)
          router.replace({
            pathname: "/assignment/[id]",
            params: { id: destination },
          });
      } else if (result.type === "error") setError("登入未完成，請重試。");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (api.current && !demoEnabled)
      try {
        await revokePush(api.current);
      } catch {}
    const refreshToken = session?.current?.refresh_token;
    clear();
    setSigned(false);
    await session?.signOut();
    if (refreshToken && !demoEnabled)
      void fetch(authBase + "/oauth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: refreshToken,
          client_id: clientID,
          token_type_hint: "refresh_token",
        }).toString(),
      }).catch(() => {});
  }
  async function command(action: string, extra: Record<string, unknown> = {}) {
    if (!detail || !api.current || submitting.current) return;
    const epoch = generation.current;
    submitting.current = true;
    setBusy(true);
    setError("");
    const fingerprint = JSON.stringify({
      id: detail.id,
      version: detail.version,
      action,
      extra,
    });
    const key = commandKeys.current.get(fingerprint) || Crypto.randomUUID();
    commandKeys.current.set(fingerprint, key);
    try {
      const changed = await api.current.command(detail, action, key, extra);
      if (epoch !== generation.current) return;
      commandKeys.current.delete(fingerprint);
      setDetail(changed);
      await refresh();
    } catch (e) {
      if (epoch === generation.current) {
        setError(message(e));
        await openDetail(detail.id);
      }
      throw new Error(message(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const closeDetail = useCallback(() => {
    detailLoad.current++;
    detailID.current = null;
    setDetail(null);
    setCandidates([]);
  }, []);
  async function savePreference(value: Preference) {
    if (!api.current || !session?.current) throw new Error("請重新登入。");
    const revision = session.revision;
    try {
      const saved = await api.current.savePreference(value);
      if (revision !== session.revision) throw new Error("請重新登入。");
      setPref(saved);
      return saved;
    } catch (e) {
      if (
        e instanceof APIError &&
        e.status === 412 &&
        revision === session.revision
      ) {
        const latest = await api.current.preference();
        if (revision === session.revision) setPref(latest);
        throw new Error("提醒已在其他裝置更新，請確認選擇後再次儲存。");
      }
      throw new Error(message(e));
    }
  }

  async function readNotice(id: string) {
    if (!api.current || !session) return;
    const revision = session.revision;
    try {
      await api.current.read(id);
      if (revision === session.revision)
        setNotices((values) =>
          values.map((n) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
    } catch (e) {
      if (revision === session.revision) setError(message(e));
    }
  }
  async function enablePush() {
    if (demoEnabled) {
      setPermission("已啟用");
      return;
    }
    if (!api.current) return;
    try {
      setPermission(await registerPush(api.current, true));
    } catch (e) {
      setError(message(e));
    }
  }
  return {
    colors,
    mode,
    toggleAppearance,
    session,
    initializationError,
    retryInitialization: () => {
      setInitializationError("");
      setInitializationAttempt((attempt) => attempt + 1);
    },
    signed,
    ready,
    stale,
    teams,
    teamID,
    setTeamID,
    items,
    notices,
    pref,
    windowOffset,
    setWindowOffset,
    loadedWindow,
    windowStart,
    detail,
    candidates,
    busy,
    error,
    setError,
    updated,
    displayZone,
    setDisplayZone,
    permission,
    refresh,
    openDetail,
    closeDetail,
    login,
    logout,
    command,
    savePreference,
    readNotice,
    enablePush,
  };
}
const ServiceContext = createContext<ReturnType<typeof useServiceState> | null>(
  null,
);
export function ServiceProvider({ children }: { children: React.ReactNode }) {
  const value = useServiceState();
  return (
    <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>
  );
}
export function useService() {
  const value = useContext(ServiceContext);
  if (!value) throw new Error("ServiceProvider is missing");
  return value;
}
