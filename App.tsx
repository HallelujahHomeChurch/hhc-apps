import { Host, Switch } from "@expo/ui";
import { light, dark, type, space } from "./src/theme";
import {
  Action,
  AppIcon,
  AssignmentRow,
  NextService,
  SectionTitle,
  EmptyState,
  ReplacementActions,
  DetailScreen,
} from "./src/service-ui";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  AppState,
  Linking,
  BackHandler,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Notifications from "expo-notifications";
import { demoEnabled, demoFetch, demoSession } from "./src/demo";
import { registerPush, revokePush } from "./src/push";
import { Sessions } from "./src/session";
import {
  Assignment,
  Candidate,
  Notice,
  Preference,
  Team,
  message,
  serviceAPI,
} from "./src/api";
WebBrowser.maybeCompleteAuthSession();
const account = process.env.EXPO_PUBLIC_ACCOUNT_URL || "";
const authBase = account.replace(/\/$/, "") + "/api/account/v1";
const apiOrigin = process.env.EXPO_PUBLIC_API_URL || "";
const clientID = process.env.EXPO_PUBLIC_OAUTH_CLIENT_ID || "hhc-app";
const ready = [account, apiOrigin].every((v) => /^https:\/\//.test(v));
type API = ReturnType<typeof serviceAPI>;
const labels = {
  home: "首頁",
  service: "服事",
  notifications: "通知",
  profile: "我的",
};
type Tab = keyof typeof labels;
const actionName: Record<string, string> = {
  created: "新增服事安排",
  changed: "服事時間或資格已更新",
  "open-request": "團契代班徵求",
  request: "代班邀請",
  switch: "代班方式已更新",
  accept: "代班已完成",
  decline: "代班邀請已婉拒",
  withdraw: "代班邀請已撤回",
  assign: "服事人選已更新",
  edit: "服事內容已更新",
  cancel: "服事已取消",
  help: "需要排班協助",
  reminder: "服事提醒",
};
function AppContent() {
  const colors = useColorScheme() === "dark" ? dark : light;
  const [session, setSession] = useState<Sessions | null>(null);
  const [stale, setStale] = useState(false);
  const [signed, setSigned] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamID, setTeamID] = useState("");
  const [items, setItems] = useState<Assignment[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [pref, setPref] = useState<Preference | null>(null);
  const [zoneDraft, setZoneDraft] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
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
  const pendingTarget = useRef<string | null>(null);
  const clear = useCallback(() => {
    generation.current++;
    setItems([]);
    setDetail(null);
    setCandidates([]);
    setNotices([]);
    setTeams([]);
    setPref(null);
    setUpdated(null);
    loadedAt.current = 0;
    commandKeys.current.clear();
  }, []);
  const text = (value: string, style?: object) => (
    <Text style={[type.body, { color: colors.text }, style]}>{value}</Text>
  );
  const button = (
    label: string,
    onPress: () => void,
    secondary = false,
    disabled = false,
  ) => (
    <Action
      title={label}
      onPress={onPress}
      colors={colors}
      secondary={secondary}
      disabled={disabled || busy}
    />
  );
  const date = (iso: string) =>
    new Intl.DateTimeFormat("zh-TW", {
      timeZone: displayZone,
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  const input = (value: string, set: (s: string) => void, label: string) => (
    <View style={{ gap: 8 }}>
      {text(label, styles.caption)}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={set}
        autoCapitalize="none"
        style={[styles.input, { borderColor: colors.line, color: colors.text }]}
      />
    </View>
  );
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
    })().catch((e) => setError(message(e)));
    return () => {
      alive = false;
    };
  }, [clear]);
  const openDetail = useCallback(async (id: string) => {
    if (!api.current) return;
    const epoch = generation.current;
    setError("");
    try {
      const a = await api.current.detail(id);
      if (epoch !== generation.current) return;
      setDetail(a);
      const members = await api.current.candidates(a.teamId);
      if (epoch === generation.current) setCandidates(members);
    } catch (e) {
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
      setStale(false);
      setUpdated(Date.now());
      loadedAt.current = performance.now();
      if (pendingTarget.current) {
        const id = pendingTarget.current;
        pendingTarget.current = null;
        void openDetail(id);
      } else if (detailID.current) {
        void openDetail(detailID.current);
      }
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
      setBusy(false);
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
    const handle = (url: string | null) => {
      const match = url?.match(/^hhc-app:\/\/service\/([0-9a-f-]{36})$/i);
      if (match) {
        pendingTarget.current = match[1];
        if (signed) void openDetail(match[1]);
      }
    };
    void Linking.getInitialURL().then(handle);
    const listener = Linking.addEventListener("url", (e) => handle(e.url));
    return () => listener.remove();
  }, [signed, openDetail]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (loadedAt.current && performance.now() - loadedAt.current >= 300000) {
        clear();
        setError("班表快取已過期，請連線後重新整理。");
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
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (detail) {
        setDetail(null);
        return true;
      }
      return false;
    });
    return () => back.remove();
  }, [detail]);
  useEffect(() => {
    const handle = (r: Notifications.NotificationResponse | null) => {
      const d = r?.notification.request.content.data;
      if (
        d?.type === "service" &&
        typeof d.assignmentId === "string" &&
        /^[0-9a-f-]{36}$/i.test(d.assignmentId)
      ) {
        pendingTarget.current = d.assignmentId;
        if (signed) void openDetail(d.assignmentId);
      }
    };
    void Notifications.getLastNotificationResponseAsync().then(handle);
    const listener =
      Notifications.addNotificationResponseReceivedListener(handle);
    return () => listener.remove();
  }, [signed, openDetail]);
  async function login() {
    if (!session || !ready) return;
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
      } else if (result.type === "error") setError("登入未完成，請重試。");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    pendingTarget.current = null;
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
  const mine = items.filter(
    (a) =>
      !a.cancelled &&
      Date.parse(a.startsAt) > Date.now() &&
      teams.some((t) => t.id === a.teamId && t.memberId === a.assigneeMemberId),
  );
  const card = (a: Assignment) => (
    <AssignmentRow
      key={a.id}
      assignment={a}
      colors={colors}
      zone={displayZone}
      onPress={() => void openDetail(a.id)}
    />
  );
  const invitations = items.filter(
    (a) =>
      !a.cancelled &&
      Date.parse(a.startsAt) > Date.now() &&
      a.request?.status === "active" &&
      a.request.mode === "nominated" &&
      teams.some(
        (t) => t.id === a.teamId && t.memberId === a.request?.targetMemberId,
      ),
  );
  const [rosterMode, setRosterMode] = useState<"mine" | "team">("mine");
  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.canvas }]}>
      <View
        style={{
          flex: 1,
          display: detail && Platform.OS === "web" ? "none" : "flex",
        }}
      >
        <View style={styles.header}>
          <View style={styles.row}>
            {text("哈利路亞家教會", {
              ...type.small,
              color: colors.primary,
              fontWeight: "600",
            })}
            {signed ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="重新整理"
                onPress={() => void refresh()}
                disabled={busy}
                style={styles.iconButton}
              >
                <AppIcon name="refresh" color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
          {text(
            signed
              ? tab === "home"
                ? "接下來的服事"
                : labels[tab]
              : "一起服事",
            styles.title,
          )}
          {tab === "home"
            ? text(
                updated
                  ? `${mine.length} 次服事安排 · ${invitations.length} 則待回覆邀請`
                  : "查看安排與同工的邀請",
                {
                  ...type.small,
                  color: colors.muted,
                },
              )
            : null}
        </View>
        {demoEnabled ? (
          <View style={styles.demo}>
            {text("示範預覽 · 合成資料，不會發送通知", {
              ...type.caption,
              color: colors.muted,
            })}
          </View>
        ) : null}
        {error ? (
          <View
            accessibilityRole="alert"
            style={[styles.notice, { backgroundColor: colors.soft }]}
          >
            {text(error)}
          </View>
        ) : null}
        {busy ? (
          <ActivityIndicator
            color={colors.primary}
            accessibilityLabel="載入中"
          />
        ) : null}
        {!signed ? (
          <View style={styles.content}>
            {text("你的服事，在這裡", styles.cardTitle)}
            {text("查看接下來的服事、尋找代班，並依自己的時區收到提醒。", {
              lineHeight: 26,
            })}
            {!ready
              ? text("測試環境尚未設定，暫時無法登入。", {
                  color: colors.muted,
                })
              : null}
            {button(
              "使用教會帳號登入",
              () => void login(),
              false,
              !ready || !session,
            )}
          </View>
        ) : (
          <>
            <FlatList
              keyboardShouldPersistTaps="handled"
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.content}
              refreshControl={
                <RefreshControl
                  refreshing={busy}
                  onRefresh={() => void refresh()}
                  tintColor={colors.primary}
                />
              }
              data={
                tab === "service"
                  ? items.filter((a) =>
                      rosterMode === "team"
                        ? a.teamId === teamID
                        : teams.some(
                            (t) =>
                              t.id === a.teamId &&
                              t.memberId === a.assigneeMemberId,
                          ),
                    )
                  : []
              }
              keyExtractor={(a) => a.id}
              renderItem={({ item }) => card(item)}
              ListHeaderComponent={
                <View style={{ gap: space.lg }}>
                  {stale
                    ? text(
                        "目前顯示暫存班表；連線恢復前無法確認最新權限與安排。",
                        {
                          color: colors.muted,
                        },
                      )
                    : null}
                  {tab === "home" ? (
                    <>
                      {mine[0] ? (
                        <NextService
                          assignment={mine[0]}
                          colors={colors}
                          zone={displayZone}
                          onPress={() => void openDetail(mine[0].id)}
                        />
                      ) : !busy && !error ? (
                        <EmptyState
                          title="目前沒有即將到來的服事"
                          description="新的安排會出現在這裡，也可以到服事頁查看團契班表。"
                          colors={colors}
                        />
                      ) : null}
                      <SectionTitle
                        title="需要你的回覆"
                        subtitle={
                          invitations.length
                            ? `${invitations.length} 位同工邀請你一起配搭`
                            : undefined
                        }
                        colors={colors}
                      />
                      {invitations.length ? (
                        <View style={styles.group}>
                          {invitations.map(card)}
                        </View>
                      ) : !busy && !error ? (
                        <EmptyState
                          title="目前沒有待回覆邀請"
                          description="收到同工的代班邀請時，會在這裡提醒你。"
                          colors={colors}
                        />
                      ) : null}
                      <SectionTitle
                        title="接下來的安排"
                        subtitle="未來 30 天"
                        colors={colors}
                      />
                      <View style={styles.group}>
                        {mine.slice(1, 4).map(card)}
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setRosterMode("mine");
                          setTab("service");
                        }}
                        style={[styles.row, styles.textLink]}
                      >
                        {text("查看我的完整班表", {
                          color: colors.primary,
                          fontWeight: "600",
                        })}
                        <AppIcon name="next" color={colors.primary} />
                      </Pressable>
                    </>
                  ) : null}
                  {tab === "service" ? (
                    <>
                      <View
                        style={[
                          styles.segment,
                          { backgroundColor: colors.line },
                        ]}
                      >
                        {(["mine", "team"] as const).map((mode) => (
                          <Pressable
                            key={mode}
                            accessibilityRole="tab"
                            accessibilityState={{
                              selected: rosterMode === mode,
                            }}
                            onPress={() => setRosterMode(mode)}
                            style={[
                              styles.segmentItem,
                              {
                                backgroundColor:
                                  rosterMode === mode
                                    ? colors.surface
                                    : "transparent",
                              },
                            ]}
                          >
                            {text(mode === "mine" ? "我的服事" : "團契班表", {
                              fontWeight: rosterMode === mode ? "600" : "400",
                            })}
                          </Pressable>
                        ))}
                      </View>
                      {rosterMode === "team" ? (
                        <View style={styles.row}>
                          {teams.map((t) => (
                            <Pressable
                              key={t.id}
                              accessibilityRole="button"
                              accessibilityState={{ selected: teamID === t.id }}
                              onPress={() => setTeamID(t.id)}
                              style={[
                                styles.chip,
                                {
                                  backgroundColor:
                                    teamID === t.id
                                      ? colors.primary
                                      : colors.surface,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  color:
                                    teamID === t.id
                                      ? colors.onPrimary
                                      : colors.text,
                                }}
                              >
                                {t.name}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                      <View style={styles.row}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="前 30 天"
                          disabled={busy || windowOffset <= -2}
                          onPress={() => setWindowOffset((v) => v - 1)}
                          style={[
                            styles.iconButton,
                            { opacity: busy || windowOffset <= -2 ? 0.35 : 1 },
                          ]}
                        >
                          <AppIcon name="back" color={colors.primary} />
                        </Pressable>
                        {text(
                          windowOffset === 0
                            ? "近期 30 天"
                            : `${windowOffset > 0 ? "後" : "前"} ${Math.abs(windowOffset) * 30} 天起`,
                          styles.caption,
                        )}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="後 30 天"
                          disabled={busy || windowOffset >= 2}
                          onPress={() => setWindowOffset((v) => v + 1)}
                          style={[
                            styles.iconButton,
                            { opacity: busy || windowOffset >= 2 ? 0.35 : 1 },
                          ]}
                        >
                          <AppIcon name="next" color={colors.primary} />
                        </Pressable>
                      </View>
                      {!busy &&
                      !error &&
                      !items.some((a) =>
                        rosterMode === "team"
                          ? a.teamId === teamID
                          : teams.some(
                              (t) =>
                                t.id === a.teamId &&
                                t.memberId === a.assigneeMemberId,
                            ),
                      ) ? (
                        <EmptyState
                          title="這段時間沒有服事安排"
                          description="試著切換日期範圍，或查看團契的完整班表。"
                          colors={colors}
                        />
                      ) : null}
                    </>
                  ) : null}
                  {tab === "notifications" ? (
                    <>
                      {notices.map((n) => (
                        <Pressable
                          key={n.id}
                          onPress={() => {
                            void api.current
                              ?.read(n.id)
                              .then(() =>
                                setNotices((values) =>
                                  values.map((v) =>
                                    v.id === n.id
                                      ? {
                                          ...v,
                                          readAt: new Date().toISOString(),
                                        }
                                      : v,
                                  ),
                                ),
                              )
                              .catch((e) => setError(message(e)));
                            void openDetail(n.assignmentId);
                          }}
                          style={[
                            styles.card,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.line,
                            },
                          ]}
                        >
                          {text(
                            actionName[n.kind] || "服事狀態已更新",
                            styles.cardTitle,
                          )}
                          {text(date(n.createdAt), styles.caption)}
                          {text(n.readAt ? "已讀" : "未讀", {
                            color: colors.primary,
                          })}
                        </Pressable>
                      ))}
                      {!notices.length ? text("目前沒有通知。") : null}
                    </>
                  ) : null}
                  {tab === "profile" ? (
                    <>
                      {text("個人提醒", styles.section)}
                      {pref ? (
                        <>
                          <View style={styles.row}>
                            <Host matchContents>
                              <Switch
                                label="開啟服事提醒"
                                value={pref.enabled}
                                onValueChange={(enabled) =>
                                  setPref({ ...pref, enabled })
                                }
                              />
                            </Host>
                          </View>
                          {input(
                            String(pref.leadDays),
                            (s) => setPref({ ...pref, leadDays: Number(s) }),
                            "提前天數（0–7）",
                          )}
                          {input(
                            pref.localTime,
                            (s) => setPref({ ...pref, localTime: s }),
                            "提醒時間（HH:mm）",
                          )}
                          {input(
                            pref.timeZone,
                            (s) => setPref({ ...pref, timeZone: s }),
                            "提醒時區（例如 Asia/Taipei）",
                          )}
                          {button("儲存提醒", () => {
                            if (!api.current) return;
                            setBusy(true);
                            void api.current
                              .savePreference(pref)
                              .then(async (p) => {
                                setPref(p);
                                await refresh();
                              })
                              .catch((e) => setError(message(e)))
                              .finally(() => setBusy(false));
                          })}
                          {text(
                            "時區不會隨旅行自動改變；所有裝置共用這組提醒設定。",
                            { color: colors.muted, lineHeight: 24 },
                          )}
                        </>
                      ) : null}
                      {input(zoneDraft, setZoneDraft, "班表顯示時區")}
                      {button(
                        "套用顯示時區",
                        () => {
                          try {
                            new Intl.DateTimeFormat("zh-TW", {
                              timeZone: zoneDraft,
                            });
                            setDisplayZone(zoneDraft);
                            setError("");
                          } catch {
                            setError("請輸入有效的 IANA 時區。");
                          }
                        },
                        true,
                      )}
                      {text("手機通知 · " + permission, styles.section)}
                      {button(
                        "設定手機通知",
                        () => {
                          if (!api.current) return;
                          void registerPush(api.current, true)
                            .then(setPermission)
                            .catch((e) => setError(message(e)));
                        },
                        true,
                      )}
                      {button("登出", () => void logout(), true)}
                    </>
                  ) : null}
                </View>
              }
              ListFooterComponent={
                <View style={{ marginTop: space.lg }}>
                  {" "}
                  {updated
                    ? text(
                        `更新於 ${new Date(updated).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })} · ${displayZone}`,
                        {
                          ...type.caption,
                          color: colors.muted,
                          marginTop: space.lg,
                        },
                      )
                    : null}
                </View>
              }
            />
            <View
              style={[
                styles.tabs,
                { borderColor: colors.line, backgroundColor: colors.surface },
              ]}
            >
              {(Object.keys(labels) as Tab[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    if (t === "home") setWindowOffset(0);
                    setTab(t);
                  }}
                  accessibilityLabel={labels[t]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t }}
                  style={({ pressed }) => [
                    styles.tab,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <AppIcon
                    name={t}
                    color={t === tab ? colors.primary : colors.muted}
                  />
                  <Text
                    style={{
                      color: t === tab ? colors.primary : colors.muted,
                      fontWeight: t === tab ? "700" : "400",
                    }}
                  >
                    {labels[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>
      <DetailScreen visible={!!detail} onClose={() => setDetail(null)}>
        <SafeAreaView
          style={[styles.shell, { backgroundColor: colors.canvas }]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="返回班表"
              onPress={() => setDetail(null)}
              style={[styles.row, { alignSelf: "flex-start", minHeight: 48 }]}
            >
              <AppIcon name="back" color={colors.primary} />
              {text("返回班表", { color: colors.primary })}
            </Pressable>
            {detail ? (
              <>
                {text(detail.teamName, {
                  ...type.small,
                  color: colors.primary,
                  fontWeight: "600",
                })}
                {text(detail.label, styles.title)}
                <View
                  style={[
                    styles.detailGroup,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.detailRow}>
                    <AppIcon name="service" color={colors.muted} />
                    {text(date(detail.startsAt), {
                      flex: 1,
                      fontWeight: "600",
                    })}
                  </View>
                  <View style={styles.detailRow}>
                    <AppIcon name="people" color={colors.muted} />
                    {text(detail.meetingName, { flex: 1 })}
                  </View>
                  {text(`顯示時區 ${displayZone}`, {
                    ...type.caption,
                    color: colors.muted,
                  })}
                </View>
                {text(
                  detail.cancelled
                    ? "這項服事已取消"
                    : detail.assigneeMemberId
                      ? `目前人選：${detail.assigneeName || candidates.find((c) => c.id === detail.assigneeMemberId)?.name || "已安排"}`
                      : "目前待補人選",
                )}
                {mine.some(
                  (a) =>
                    a.id !== detail.id &&
                    Date.parse(a.startsAt) < Date.parse(detail.endsAt) &&
                    Date.parse(a.endsAt) > Date.parse(detail.startsAt),
                )
                  ? text("這個時段與你的其他服事重疊，接受前請確認能夠配搭。", {
                      color: colors.primary,
                    })
                  : null}
                {detail.needsAttention
                  ? text("目前人選資格已變更，請團契負責人重新安排。")
                  : null}
                {detail.reminderAt
                  ? text(
                      `個人提醒：${date(detail.reminderAt)}（${displayZone}）`,
                      styles.caption,
                    )
                  : null}
                {detail.reminderReason === "at_or_after_start"
                  ? text("提醒時間不早於服事開始，這次不會排定個人提醒。")
                  : null}
                {detail.reminderReason === "past"
                  ? text("這次提醒時間已過，不會補送；請以最新班表為準。")
                  : null}
                {detail.helpOpen
                  ? text(
                      detail.helpRecipients === 0
                        ? "已保留求助，目前沒有可通知的團契負責人。"
                        : "已請團契負責人協助；原指派仍有效。",
                    )
                  : null}
                {detail.request
                  ? text(
                      `代班請求：${{ active: "等待回覆", accepted: "已完成", declined: "已婉拒", withdrawn: "已撤回", invalidated: "已失效", expired: "已截止" }[detail.request.status]}`,
                    )
                  : null}
                {error ? (
                  <View accessibilityRole="alert">
                    {text(error, { color: colors.primary })}
                  </View>
                ) : null}
                <ReplacementActions
                  assignment={detail}
                  candidates={candidates}
                  memberId={teams.find((t) => t.id === detail.teamId)?.memberId}
                  busy={busy}
                  colors={colors}
                  onCommand={command}
                />
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </DetailScreen>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: {
    paddingHorizontal: space.page,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    gap: space.xs,
  },
  title: type.title,
  section: { ...type.heading, marginTop: space.md },
  content: {
    paddingHorizontal: space.page,
    paddingTop: space.sm,
    gap: space.lg,
    paddingBottom: space.xxl,
  },
  card: {
    padding: space.lg,
    borderRadius: 12,
    borderCurve: "continuous",
    gap: space.sm,
  },
  cardTitle: type.heading,
  caption: type.small,
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    justifyContent: "space-between",
    alignItems: "center",
  },
  chip: { padding: space.md, borderRadius: 12, minHeight: 48 },
  input: {
    minHeight: 52,
    padding: space.md,
    borderWidth: 1,
    borderRadius: 12,
    ...type.body,
  },
  notice: {
    padding: space.lg,
    marginHorizontal: space.page,
    borderRadius: 12,
    marginBottom: space.md,
  },
  demo: { paddingHorizontal: space.page, paddingBottom: space.md },
  tabs: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    padding: space.sm,
    gap: space.xs,
    minHeight: 60,
  },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  group: { borderRadius: 16, borderCurve: "continuous", overflow: "hidden" },
  textLink: { minHeight: 48 },
  segment: { flexDirection: "row", borderRadius: 12, padding: space.xs },
  segmentItem: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    padding: space.sm,
    borderRadius: 8,
  },
  detailGroup: {
    padding: space.lg,
    gap: space.lg,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: space.md },
});
