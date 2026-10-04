import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SectionList,
  Platform,
  Pressable,
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
import { Host, Picker } from "@expo/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { PullToRefresh } from "./pull-to-refresh";
import { AppearanceSettings, ReminderSettings } from "./reminder-settings";
import {
  calendarMonth,
  dateKey,
  monthRange,
  monthTitle,
  shiftMonth,
  formatDate,
  zoneLabel,
} from "./presentation";
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
  const {
    colors,
    session,
    ready,
    busy,
    login,
    error,
    initializationError,
    retryInitialization,
  } = useService();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{
        paddingHorizontal: space.page,
        paddingTop: insets.top + space.lg,
        paddingBottom: insets.bottom + space.page,
        flexGrow: 1,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingVertical: space.xxl,
          gap: space.xl,
        }}
      >
        <Image
          source={require("../assets/hhc-logo.png")}
          accessible={false}
          style={{ width: 88, height: 88 }}
        />
        <View style={{ gap: space.sm }}>
          <Text
            accessibilityRole="header"
            style={{
              color: colors.text,
              fontSize: 32,
              fontWeight: "700",
              letterSpacing: 1,
            }}
          >
            HHC
          </Text>
          <Text
            style={[type.heading, { color: colors.muted, fontWeight: "400" }]}
          >
            哈利路亞家教會
          </Text>
        </View>
      </View>
      <View style={{ gap: space.lg }}>
        {!!(initializationError || error) && (
          <Text
            accessibilityRole="alert"
            style={[type.small, { color: colors.primary }]}
          >
            {initializationError || error}
          </Text>
        )}
        {!session ? (
          initializationError ? (
            <Action
              title="重試"
              onPress={retryInitialization}
              colors={colors}
            />
          ) : (
            <ActivityIndicator
              accessibilityLabel="正在讀取登入狀態"
              color={colors.primary}
            />
          )
        ) : (
          <>
            {!ready && (
              <Text style={[type.small, { color: colors.muted }]}>
                登入服務尚未設定完成。
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
      </View>
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
    month,
    setMonth,
    loadedMonth,
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
  const windowReady = tab !== "service" || loadedMonth === month;
  const available = windowReady ? items : [];
  const isMine = (a: Assignment) =>
    teams.some((t) => t.id === a.teamId && t.memberId === a.assigneeMemberId);
  const mine = available.filter(
    (a) =>
      !a.cancelled &&
      Date.parse(a.startsAt) > Date.now() &&
      Date.parse(a.startsAt) < Date.now() + 60 * 86400000 &&
      isMine(a),
  );
  const invitations = available.filter(
    (a) =>
      !a.cancelled &&
      Date.parse(a.startsAt) > Date.now() &&
      Date.parse(a.startsAt) < Date.now() + 60 * 86400000 &&
      a.request?.status === "active" &&
      a.request.mode === "nominated" &&
      teams.some(
        (t) => t.id === a.teamId && t.memberId === a.request?.targetMemberId,
      ),
  );
  const roster = available.filter(
    (a) =>
      calendarMonth(a.startsAt, displayZone) === month &&
      (rosterMode === "team" ? a.teamId === teamID : isMine(a)),
  );
  const grouped = new Map<string, Assignment[]>();
  for (const a of roster) {
    const key = dateKey(a.startsAt, displayZone);
    grouped.set(key, [...(grouped.get(key) || []), a]);
  }
  const sections = [...grouped].map(([key, data]) => ({ key, data }));
  const currentMonth = calendarMonth(Date.now(), displayZone);
  const months = Array.from({ length: 6 }, (_, i) =>
    shiftMonth(currentMonth, i - 2),
  ).filter(
    (value) => Date.parse(monthRange(value).from) >= Date.now() - 90 * 86400000,
  );
  if (!months.includes(month)) months.push(month);
  months.sort();
  const open = (id: string) =>
    router.push({ pathname: "/assignment/[id]", params: { id } });
  const row = (a: Assignment) => (
    <AssignmentRow
      key={a.id}
      showDate={false}
      style={{ backgroundColor: colors.canvas, paddingHorizontal: 0 }}
      assignment={a}
      colors={colors}
      zone={displayZone}
      viewerId={teams.find((t) => t.id === a.teamId)?.memberId}
      showAssignee={(tab === "service" && rosterMode === "team") || !isMine(a)}
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
    alwaysBounceVertical: true,
    contentContainerStyle: {
      paddingHorizontal: space.page,
      paddingTop: space.md,
      paddingBottom: space.xxl,
    },
    refreshControl: (
      <PullToRefresh
        onRefresh={refresh}
        enabled={!busy}
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
        <View style={{ gap: space.xl }}>
          {!!invitations.length && (
            <View style={{ gap: space.sm }}>
              <SectionTitle
                title={`待回覆 ${invitations.length}`}
                colors={colors}
              />
              {invitations.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  accessibilityLabel={`代班邀請，${a.label}，${formatDate(a.startsAt, displayZone)}`}
                  onPress={() => open(a.id)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.md,
                    paddingVertical: space.md,
                    borderBottomWidth: 0.5,
                    borderColor: colors.line,
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <View style={{ flex: 1, gap: space.xs }}>
                    <Text
                      style={[
                        type.body,
                        { color: colors.text, fontWeight: "600" },
                      ]}
                    >
                      {a.label}
                    </Text>
                    <Text style={[type.small, { color: colors.muted }]}>
                      {formatDate(a.startsAt, displayZone)} · {a.teamName}
                    </Text>
                  </View>
                  <AppIcon name="next" color={colors.primary} size={18} />
                </Pressable>
              ))}
            </View>
          )}
          {mine[0] ? (
            <NextService
              assignment={mine[0]}
              colors={colors}
              zone={displayZone}
              onPress={() => open(mine[0].id)}
            />
          ) : (
            updated &&
            !error && (
              <EmptyState
                title={teams.length ? "目前沒有近期服事" : "尚未加入服事團契"}
                colors={colors}
              />
            )
          )}
        </View>
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
            teams.length > 0 &&
            (teams.length === 1 ? (
              <Text style={[type.small, { color: colors.muted }]}>
                {teams[0].name}
              </Text>
            ) : (
              <Host
                colorScheme={colors.scheme}
                seedColor={colors.primary}
                matchContents
              >
                <Picker
                  selectedValue={teamID}
                  onValueChange={setTeamID}
                  testID="team-picker"
                >
                  {teams.map((t) => (
                    <Picker.Item key={t.id} value={t.id} label={t.name} />
                  ))}
                </Picker>
              </Host>
            ))}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: space.sm,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="上個月"
              disabled={busy || month === months[0]}
              onPress={() => setMonth(shiftMonth(month, -1))}
              style={{
                minWidth: 44,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
                opacity: busy || month === months[0] ? 0.3 : 1,
              }}
            >
              <AppIcon name="back" color={colors.primary} />
            </Pressable>
            {Platform.OS === "web" ? (
              <select
                aria-label="選擇月份"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                disabled={busy}
                style={{
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                  color: colors.text,
                  background: "transparent",
                  border: 0,
                  minHeight: 48,
                  maxWidth: "70%",
                }}
              >
                {months.map((value) => (
                  <option key={value} value={value}>
                    {monthTitle(value)}
                  </option>
                ))}
              </select>
            ) : (
              <Host
                colorScheme={colors.scheme}
                seedColor={colors.primary}
                matchContents
              >
                <Picker
                  selectedValue={month}
                  onValueChange={setMonth}
                  enabled={!busy}
                  testID="month-picker"
                >
                  {months.map((value) => (
                    <Picker.Item
                      key={value}
                      value={value}
                      label={monthTitle(value)}
                    />
                  ))}
                </Picker>
              </Host>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="下個月"
              disabled={busy || month === months.at(-1)}
              onPress={() => setMonth(shiftMonth(month, 1))}
              style={{
                minWidth: 44,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
                opacity: busy || month === months.at(-1) ? 0.3 : 1,
              }}
            >
              <AppIcon name="next" color={colors.primary} />
            </Pressable>
          </View>
          {roster.some((a) => a.timeZone !== displayZone) && (
            <Text style={[type.caption, { color: colors.muted }]}>
              {zoneLabel(displayZone)}時間
            </Text>
          )}
          {updated && windowReady && !busy && !error && !roster.length && (
            <EmptyState
              title={teams.length ? "這個月沒有服事安排" : "尚未加入服事團契"}
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
      {tab === "profile" && <MemberSummary />}
      {tab === "profile" && <AppearanceSettings />}
      {tab === "profile" && pref && <ReminderSettings preference={pref} />}
      {tab === "profile" && (
        <Action
          title="登出"
          quiet
          colors={colors}
          onPress={() => void state.logout()}
        />
      )}
    </View>
  );
  return tab === "service" ? (
    <SectionList
      {...scrollProps}
      sections={sections}
      stickySectionHeadersEnabled={false}
      keyExtractor={(a) => a.id}
      renderSectionHeader={({ section }) => (
        <Text
          accessibilityRole="header"
          style={[
            type.heading,
            {
              color: colors.text,
              paddingTop: space.lg,
              paddingBottom: space.sm,
            },
          ]}
        >
          {new Intl.DateTimeFormat("zh-TW", {
            timeZone: displayZone,
            month: "numeric",
            day: "numeric",
            weekday: "short",
          }).format(new Date(section.data[0].startsAt))}
        </Text>
      )}
      renderItem={({ item }) => row(item)}
      ListHeaderComponent={content}
    />
  ) : (
    <ScrollView {...scrollProps}>{content}</ScrollView>
  );
}
function MemberSummary() {
  const { colors, profile, profileError, refreshProfile, teams, updated } =
    useService();
  const name =
    profile?.nickname ||
    [profile?.last_name, profile?.first_name].filter(Boolean).join("") ||
    "教會帳號";
  return (
    <View style={{ gap: space.lg, paddingVertical: space.md }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppIcon name="profile" size={30} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <Text
            accessibilityRole="header"
            style={[type.title, { color: colors.text }]}
          >
            {name}
          </Text>
          {profile?.email && (
            <Text selectable style={[type.small, { color: colors.muted }]}>
              {profile.email}
            </Text>
          )}
        </View>
      </View>
      {profileError && (
        <View style={{ gap: space.sm }}>
          <Text
            accessibilityRole="alert"
            style={[type.small, { color: colors.muted }]}
          >
            {profileError}
          </Text>
          <Action
            quiet
            title="重新讀取會員資料"
            colors={colors}
            onPress={() => void refreshProfile()}
          />
        </View>
      )}
      {updated && (
        <View style={{ gap: space.sm }}>
          <SectionTitle title="我的團契" colors={colors} />
          {teams.length ? (
            teams.map((team) => (
              <View
                key={team.id}
                style={{
                  paddingVertical: space.md,
                  gap: space.xs,
                  borderBottomWidth: 0.5,
                  borderColor: colors.line,
                }}
              >
                <Text style={[type.body, { color: colors.text }]}>
                  {team.name}
                </Text>
                {team.canManage && (
                  <Text style={[type.small, { color: colors.muted }]}>
                    團契負責人
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={[type.body, { color: colors.muted }]}>
              尚未加入服事團契
            </Text>
          )}
        </View>
      )}
    </View>
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
    refresh,
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
      alwaysBounceVertical
      refreshControl={
        <PullToRefresh
          onRefresh={refresh}
          enabled={!busy}
          tintColor={colors.primary}
        />
      }
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
