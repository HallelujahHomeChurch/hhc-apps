import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
  Text,
  View,
} from "react-native";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useIsFocused,
  useRouter,
} from "expo-router";
import { useService } from "./service-state";
import {
  Action,
  AppIcon,
  AssignmentRow,
  EmptyState,
  NextService,
  ReplacementActions,
  SectionTitle,
} from "./service-ui";
import { ReminderSettings } from "./reminder-settings";
import { formatDate, formatRange, zoneLabel } from "./presentation";
import { space, type } from "./theme";
import type { Assignment } from "./api";
export type Tab = "home" | "service" | "notifications" | "profile";
export const labels = {
  home: "首頁",
  service: "服事",
  notifications: "通知",
  profile: "我的",
};
const noticeLabels: Record<string, string> = {
  created: "新增服事安排",
  changed: "服事安排已更新",
  "open-request": "團契徵求代班",
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

export function Feedback() {
  const { error, stale, colors, updated, refresh, busy } = useService();
  if (!error && !stale) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.soft,
        padding: space.lg,
        borderRadius: 16,
        gap: space.sm,
      }}
    >
      <Text style={[type.body, { color: colors.text }]}>
        {error || "目前離線，班表可能尚未更新。"}
      </Text>
      {stale && updated && (
        <Text style={[type.caption, { color: colors.muted }]}>
          最後更新{" "}
          {new Date(updated).toLocaleTimeString("zh-TW", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void refresh()}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Text style={[type.body, { color: colors.primary }]}>重新整理</Text>
      </Pressable>
    </View>
  );
}
export function LoginScreen() {
  const { colors, session, ready, busy, login } = useService();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: space.page,
        gap: space.xl,
        flexGrow: 1,
        justifyContent: "center",
        backgroundColor: colors.canvas,
      }}
    >
      <Text style={[type.small, { color: colors.primary, fontWeight: "600" }]}>
        HHC / 哈利路亞家教會
      </Text>
      <Text style={[type.title, { color: colors.text }]}>一起服事</Text>
      <Text style={[type.body, { color: colors.muted }]}>
        班表、代班與提醒，在這裡。
      </Text>
      <Feedback />
      {!session ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          {!ready && (
            <Text style={[type.small, { color: colors.muted }]}>
              測試環境尚未設定，暫時無法登入。
            </Text>
          )}
          <Action
            title="使用教會帳號登入"
            colors={colors}
            onPress={() => void login()}
            disabled={!ready}
            loading={busy}
          />
        </>
      )}
    </ScrollView>
  );
}
export function TabScreen({ tab }: { tab: Tab }) {
  const state = useService();
  const {
    colors,
    signed,
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
    busy,
    error,
    updated,
    displayZone,
    refresh,
    readNotice,
  } = state;
  const router = useRouter();
  const focused = useIsFocused();
  const [rosterMode, setRosterMode] = useState<"mine" | "team">("mine");
  useFocusEffect(
    useCallback(() => {
      if (tab === "home") setWindowOffset(0);
    }, [tab, setWindowOffset]),
  );
  const windowReady =
    loadedWindow === windowOffset && (tab !== "home" || windowOffset === 0);
  const available = windowReady ? items : [];
  const isMine = (a: Assignment) =>
    teams.some((t) => t.id === a.teamId && t.memberId === a.assigneeMemberId);
  const mine = available.filter(
    (a) => !a.cancelled && Date.parse(a.startsAt) > Date.now() && isMine(a),
  );
  const invitations = available.filter(
    (a) =>
      !a.cancelled &&
      Date.parse(a.startsAt) > Date.now() &&
      a.request?.status === "active" &&
      a.request.mode === "nominated" &&
      teams.some(
        (t) => t.id === a.teamId && t.memberId === a.request?.targetMemberId,
      ),
  );
  const roster = available.filter((a) =>
    rosterMode === "team" ? a.teamId === teamID : isMine(a),
  );
  const open = (id: string) =>
    router.push({ pathname: "/assignment/[id]", params: { id } });
  const row = (a: Assignment) => (
    <AssignmentRow
      key={a.id}
      assignment={a}
      colors={colors}
      zone={displayZone}
      viewerId={teams.find((t) => t.id === a.teamId)?.memberId}
      onPress={() => open(a.id)}
    />
  );
  const group = { borderRadius: 22, overflow: "hidden" as const };
  const textStyle = [type.body, { color: colors.text }];
  if (!signed) return <LoginScreen />;
  const scrollProps: ScrollViewProps = {
    style: {
      flex: 1,
      backgroundColor: colors.canvas,
      display: Platform.OS === "web" && !focused ? "none" : "flex",
    },
    accessibilityElementsHidden: !focused,
    importantForAccessibility: focused ? "auto" : "no-hide-descendants",
    "aria-hidden": !focused,
    contentInsetAdjustmentBehavior: "automatic",
    keyboardShouldPersistTaps: "handled",
    contentContainerStyle: {
      paddingHorizontal: space.page,
      paddingTop: space.md,
      paddingBottom: space.xxl,
    },
    refreshControl: (
      <RefreshControl
        refreshing={busy}
        onRefresh={() => void refresh()}
        tintColor={colors.primary}
      />
    ),
  };
  const content = (
    <View style={{ gap: space.lg, paddingBottom: space.lg }}>
      {tab === "home" && items.some((a) => a.timeZone !== displayZone) && (
        <Text style={[type.caption, { color: colors.muted }]}>
          {zoneLabel(displayZone)}時間
        </Text>
      )}
      <Feedback />
      {((!updated && !error) || !windowReady) && (
        <ActivityIndicator accessibilityLabel="載入中" color={colors.primary} />
      )}
      {tab === "home" && (
        <>
          {mine[0] ? (
            <NextService
              assignment={mine[0]}
              colors={colors}
              zone={displayZone}
              onPress={() => open(mine[0].id)}
            />
          ) : (
            updated &&
            windowReady &&
            !error && (
              <EmptyState
                title="目前沒有即將到來的服事"
                description="到服事頁查看團契班表。"
                colors={colors}
              />
            )
          )}
          {!!invitations.length && (
            <>
              <SectionTitle
                title={`待回覆 ${invitations.length}`}
                colors={colors}
              />
              <View style={group}>{invitations.map(row)}</View>
            </>
          )}
          {mine.length > 1 && (
            <>
              <SectionTitle title="接下來" colors={colors} />
              <View style={group}>{mine.slice(1, 4).map(row)}</View>
            </>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate("/service")}
            style={{
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={[type.body, { color: colors.primary, fontWeight: "600" }]}
            >
              完整班表
            </Text>
            <AppIcon name="next" color={colors.primary} />
          </Pressable>
        </>
      )}
      {tab === "service" && (
        <>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.line,
              padding: space.xs,
              borderRadius: 14,
            }}
          >
            {(["mine", "team"] as const).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="tab"
                accessibilityState={{ selected: rosterMode === mode }}
                onPress={() => setRosterMode(mode)}
                style={{
                  flex: 1,
                  minHeight: 48,
                  padding: space.sm,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  backgroundColor:
                    rosterMode === mode ? colors.surface : "transparent",
                }}
              >
                <Text
                  style={[
                    ...textStyle,
                    { fontWeight: rosterMode === mode ? "600" : "400" },
                  ]}
                >
                  {mode === "mine" ? "我的服事" : "團契班表"}
                </Text>
              </Pressable>
            ))}
          </View>
          {rosterMode === "team" &&
            (teams.length === 1 ? (
              <Text style={[type.small, { color: colors.muted }]}>
                {teams[0].name}
              </Text>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: space.sm,
                }}
              >
                {teams.map((t) => (
                  <Pressable
                    key={t.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: teamID === t.id }}
                    onPress={() => setTeamID(t.id)}
                    style={{
                      padding: space.md,
                      minHeight: 48,
                      borderRadius: 12,
                      backgroundColor:
                        t.id === teamID ? colors.soft : colors.surface,
                    }}
                  >
                    <Text style={[type.body, { color: colors.text }]}>
                      {t.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.xs,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="前 30 天"
              disabled={busy || windowOffset <= -2}
              onPress={() => setWindowOffset((v) => v - 1)}
              style={{
                minWidth: 48,
                minHeight: 48,
                justifyContent: "center",
                alignItems: "center",
                opacity: busy || windowOffset <= -2 ? 0.35 : 1,
              }}
            >
              <AppIcon name="back" color={colors.primary} />
            </Pressable>
            <Text
              style={[
                type.small,
                {
                  color: colors.text,
                  textAlign: "center",
                  flex: 1,
                  fontVariant: ["tabular-nums"],
                },
              ]}
            >
              {formatRange(
                windowStart + (windowOffset - loadedWindow) * 30 * 86400000,
                displayZone,
              )}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="後 30 天"
              disabled={busy || windowOffset >= 2}
              onPress={() => setWindowOffset((v) => v + 1)}
              style={{
                minWidth: 48,
                minHeight: 48,
                justifyContent: "center",
                alignItems: "center",
                opacity: busy || windowOffset >= 2 ? 0.35 : 1,
              }}
            >
              <AppIcon name="next" color={colors.primary} />
            </Pressable>
          </View>
          <Text style={[type.caption, { color: colors.muted }]}>
            {zoneLabel(displayZone)}時間
          </Text>
          {updated && windowReady && !busy && !error && !roster.length && (
            <EmptyState
              title="這段時間沒有安排"
              description="切換日期，查看其他服事。"
              colors={colors}
            />
          )}
        </>
      )}
      {tab === "notifications" && (
        <View style={group}>
          {notices.map((n) => {
            const assignment = items.find((a) => a.id === n.assignmentId);
            return (
              <Pressable
                key={n.id}
                accessibilityRole="button"
                accessibilityLabel={`${n.readAt ? "" : "未讀，"}${noticeLabels[n.kind] || "服事狀態已更新"}${assignment ? `，${assignment.label}` : ""}`}
                onPress={() => {
                  void readNotice(n.id);
                  open(n.assignmentId);
                }}
                style={{
                  backgroundColor: colors.surface,
                  padding: space.lg,
                  gap: space.sm,
                  borderBottomWidth: 0.5,
                  borderColor: colors.line,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.sm,
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: n.readAt
                        ? "transparent"
                        : colors.primary,
                    }}
                  />
                  <Text
                    style={[
                      type.body,
                      {
                        color: colors.text,
                        fontWeight: n.readAt ? "400" : "600",
                        flex: 1,
                      },
                    ]}
                  >
                    {noticeLabels[n.kind] || "服事狀態已更新"}
                  </Text>
                  <AppIcon name="next" size={18} color={colors.muted} />
                </View>
                {assignment && (
                  <Text style={[type.small, { color: colors.text }]}>
                    {assignment.label} ·{" "}
                    {formatDate(assignment.startsAt, displayZone)}
                  </Text>
                )}
                <Text style={[type.caption, { color: colors.muted }]}>
                  {formatDate(n.createdAt, displayZone)}
                </Text>
              </Pressable>
            );
          })}
          {!notices.length && updated && !busy && !error && (
            <EmptyState
              title="目前沒有通知"
              description="服事異動與代班邀請會顯示在這裡。"
              colors={colors}
            />
          )}
        </View>
      )}
      {tab === "profile" && pref && <ReminderSettings preference={pref} />}
    </View>
  );
  return tab === "service" ? (
    <FlatList
      {...scrollProps}
      data={roster}
      keyExtractor={(a) => a.id}
      renderItem={({ item }) => row(item)}
      ListHeaderComponent={content}
    />
  ) : (
    <ScrollView {...scrollProps}>{content}</ScrollView>
  );
}
export function AssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useService();
  const {
    signed,
    colors,
    detail,
    candidates,
    teams,
    items,
    busy,
    error,
    displayZone,
    openDetail,
    closeDetail,
    command,
    updated,
  } = state;
  const dataReady = Boolean(updated);
  useFocusEffect(
    useCallback(() => {
      if (signed && dataReady) void openDetail(id);
      return closeDetail;
    }, [id, signed, dataReady, openDetail, closeDetail]),
  );
  if (!signed) return <LoginScreen />;
  const a = detail?.id === id ? detail : null;
  const memberId = teams.find((t) => t.id === a?.teamId)?.memberId;
  const overlap =
    a &&
    items.some(
      (other) =>
        other.id !== a.id &&
        !other.cancelled &&
        teams.some(
          (t) => t.id === other.teamId && t.memberId === other.assigneeMemberId,
        ) &&
        Date.parse(other.startsAt) < Date.parse(a.endsAt) &&
        Date.parse(other.endsAt) > Date.parse(a.startsAt),
    );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: space.page,
        gap: space.lg,
        paddingBottom: space.xxl,
      }}
    >
      <Stack.Screen options={{ title: "服事詳情", headerBackTitle: "返回" }} />
      <Feedback />
      {!a ? (
        !error && (
          <ActivityIndicator
            color={colors.primary}
            accessibilityLabel="載入服事詳情"
          />
        )
      ) : (
        <>
          <Text
            style={[type.small, { color: colors.primary, fontWeight: "600" }]}
          >
            {a.teamName}
          </Text>
          <Text style={[type.title, { color: colors.text }]}>{a.label}</Text>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 24,
              padding: space.lg,
              gap: space.lg,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                gap: space.md,
                alignItems: "center",
              }}
            >
              <AppIcon name="service" color={colors.muted} />
              <Text
                style={[
                  type.body,
                  { color: colors.text, fontWeight: "600", flex: 1 },
                ]}
              >
                {formatDate(a.startsAt, displayZone)} –{" "}
                {new Intl.DateTimeFormat("zh-TW", {
                  timeZone: displayZone,
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(new Date(a.endsAt))}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: space.md,
                alignItems: "center",
              }}
            >
              <AppIcon name="people" color={colors.muted} />
              <Text style={[type.body, { color: colors.text, flex: 1 }]}>
                {a.meetingName}
              </Text>
            </View>
            <Text style={[type.small, { color: colors.muted }]}>
              {a.cancelled
                ? "這項服事已取消"
                : `服事同工　${a.assigneeMemberId === memberId ? "你" : a.assigneeName || "待安排"}`}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              {zoneLabel(displayZone)}時間
              {a.timeZone !== displayZone
                ? ` · 聚會所在地：${zoneLabel(a.timeZone)}`
                : ""}
            </Text>
          </View>
          {overlap && (
            <Text
              accessibilityRole="alert"
              style={[type.body, { color: colors.primary }]}
            >
              與你的其他服事重疊，接受前請確認時間。
            </Text>
          )}
          {a.needsAttention && (
            <Text style={[type.body, { color: colors.primary }]}>
              人選資格已變更，請負責人重新安排。
            </Text>
          )}
          {a.reminderAt && (
            <Text style={[type.small, { color: colors.muted }]}>
              提醒　{formatDate(a.reminderAt, displayZone)}
            </Text>
          )}
          {a.reminderReason === "at_or_after_start" && (
            <Text style={[type.small, { color: colors.muted }]}>
              提醒時間晚於或等於開始時間，這次不會發送提醒。
            </Text>
          )}
          {a.reminderReason === "past" && (
            <Text style={[type.small, { color: colors.muted }]}>
              提醒時間已過，這次不會補送。
            </Text>
          )}
          {a.helpOpen && a.helpRecipients === 0 && (
            <Text style={[type.small, { color: colors.primary }]}>
              已保留求助，目前沒有可通知的團契負責人。
            </Text>
          )}
          {a.request &&
            ["declined", "expired", "invalidated"].includes(
              a.request.status,
            ) && (
              <Text style={[type.small, { color: colors.muted }]}>
                {a.request.status === "declined"
                  ? "對方這次無法代班"
                  : a.request.status === "expired"
                    ? "代班請求已截止"
                    : "代班請求已失效"}
              </Text>
            )}
          <ReplacementActions
            assignment={a}
            candidates={candidates}
            memberId={memberId}
            busy={busy}
            colors={colors}
            zone={displayZone}
            onCommand={command}
          />
        </>
      )}
    </ScrollView>
  );
}
