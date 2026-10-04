import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolView } from "expo-symbols";
import { BottomSheet, Host, RNHostView } from "@expo/ui";
import type { Assignment, Candidate } from "./api";
import { Palette, space, type } from "./theme";
import { formatDate } from "./presentation";

const icons = {
  home: ["house", "home"],
  service: ["calendar", "calendar-today"],
  notifications: ["bell", "notifications-none"],
  profile: ["person.crop.circle", "person-outline"],
  next: ["chevron.right", "chevron-right"],
  back: ["chevron.left", "arrow-back"],
  people: ["person.2", "people-outline"],
  clock: ["clock", "schedule"],
  check: ["checkmark.circle", "check-circle-outline"],
  search: ["magnifyingglass", "search"],
  refresh: ["arrow.clockwise", "refresh"],
  close: ["xmark", "close"],
} as const;
export function AppIcon({
  name,
  color,
  size = 22,
}: {
  name: keyof typeof icons;
  color: string;
  size?: number;
}) {
  return Platform.OS === "ios" ? (
    <SymbolView
      name={icons[name][0]}
      tintColor={color}
      style={{ width: size, height: size }}
    />
  ) : (
    <MaterialIcons name={icons[name][1]} color={color} size={size} />
  );
}
export function Brand({ color }: { color: string }) {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="HHC"
      style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
    >
      <Image
        source={require("../assets/hhc-logo.png")}
        accessible={false}
        style={{ width: 28, height: 28 }}
      />
      <Text
        style={{ color, fontSize: 18, fontWeight: "700", letterSpacing: 0.5 }}
      >
        HHC
      </Text>
    </View>
  );
}
export function Action({
  title,
  onPress,
  colors,
  secondary = false,
  quiet = false,
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  colors: Palette;
  secondary?: boolean;
  quiet?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        {
          backgroundColor: quiet
            ? "transparent"
            : secondary
              ? colors.soft
              : colors.primary,
          opacity: disabled || loading ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={secondary || quiet ? colors.primary : colors.onPrimary}
        />
      ) : null}
      <Text
        style={[
          type.body,
          {
            fontWeight: "600",
            color: secondary || quiet ? colors.primary : colors.onPrimary,
          },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function SectionTitle({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle?: string;
  colors: Palette;
}) {
  return (
    <View style={{ gap: space.xs, marginTop: space.lg }}>
      <Text
        accessibilityRole="header"
        style={[type.heading, { color: colors.text }]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[type.small, { color: colors.muted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
export function EmptyState({
  title,
  description,
  colors,
}: {
  title: string;
  description?: string;
  colors: Palette;
}) {
  return (
    <View style={{ paddingVertical: space.page, gap: space.sm }}>
      <Text style={[type.body, { color: colors.text, fontWeight: "600" }]}>
        {title}
      </Text>
      {description && (
        <Text style={[type.small, { color: colors.muted }]}>{description}</Text>
      )}
    </View>
  );
}
function parts(iso: string, zone: string) {
  const d = new Date(iso);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("zh-TW", { timeZone: zone, ...options }).format(d);
  return {
    day: format({ day: "numeric" }).replace("日", ""),
    month: format({ month: "long" }),
    weekday: format({ weekday: "short" }),
    time: format({ hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}
export function AssignmentRow({
  assignment: a,
  colors,
  zone,
  onPress,
  viewerId,
  showAssignee = true,
}: {
  assignment: Assignment;
  colors: Palette;
  zone: string;
  onPress: () => void;
  viewerId?: string;
  showAssignee?: boolean;
}) {
  const d = parts(a.startsAt, zone);
  const status = a.cancelled
    ? "已取消"
    : a.needsAttention
      ? "待負責人處理"
      : a.request?.status === "active"
        ? a.request.mode === "open"
          ? "徵求代班"
          : a.request.targetMemberId === viewerId
            ? "邀請你代班"
            : "等待代班回覆"
        : a.helpOpen
          ? "負責人協助中"
          : "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${d.month}${d.day}日 ${d.time}，${a.label}，${status || a.assigneeName || "待補人選"}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.assignment,
        {
          borderColor: colors.line,
          backgroundColor: pressed ? colors.soft : colors.surface,
        },
      ]}
    >
      <View style={[s.dateRail, { backgroundColor: colors.canvas }]}>
        <Text style={[type.caption, { color: colors.muted }]}>{d.month}</Text>
        <Text style={[s.day, { color: colors.text }]}>{d.day}</Text>
        <Text style={[type.caption, { color: colors.muted }]}>{d.weekday}</Text>
      </View>
      <View style={{ flex: 1, gap: space.xs }}>
        <Text style={[type.body, { color: colors.text, fontWeight: "600" }]}>
          {a.label}
        </Text>
        <Text style={[type.small, { color: colors.muted }]}>
          {d.time} · {a.meetingName}
        </Text>
        {showAssignee && (
          <Text style={[type.small, { color: colors.muted }]}>
            {a.assigneeName || (a.assigneeMemberId ? "已安排同工" : "待補人選")}
          </Text>
        )}
        {status ? (
          <Text
            style={[
              type.caption,
              {
                color: colors.primary,
                fontWeight: "600",
                backgroundColor: colors.soft,
                alignSelf: "flex-start",
                paddingHorizontal: space.sm,
                paddingVertical: space.xs,
                borderRadius: 8,
                overflow: "hidden",
              },
            ]}
          >
            {status}
          </Text>
        ) : null}
      </View>
      <AppIcon name="next" color={colors.muted} size={20} />
    </Pressable>
  );
}
export function NextService({
  assignment: a,
  colors,
  zone,
  onPress,
}: {
  assignment: Assignment;
  colors: Palette;
  zone: string;
  onPress: () => void;
}) {
  const d = parts(a.startsAt, zone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`下一次服事：${a.label}，${d.month}${d.day}日 ${d.time}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.nextService,
        { backgroundColor: colors.feature, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={s.heroEyebrow}>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
        >
          <AppIcon name="service" color={colors.featureAccent} size={18} />
          <Text style={[type.small, { color: colors.featureMuted }]}>
            下一次服事
          </Text>
        </View>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
        >
          <Text style={[type.caption, { color: colors.featureMuted }]}>
            {a.teamName}
          </Text>
          <AppIcon name="next" color={colors.featureAccent} size={18} />
        </View>
      </View>
      <View style={s.heroTop}>
        <View style={{ gap: space.sm, flex: 1 }}>
          <Text style={[type.title, { color: colors.featureText }]}>
            {a.label}
          </Text>
          <Text style={[type.body, { color: colors.featureMuted }]}>
            {d.time} · {a.meetingName}
          </Text>
        </View>
        <View style={s.heroDate}>
          <Text style={[s.heroDay, { color: colors.featureAccent }]}>
            {d.day}
          </Text>
          <Text style={[type.caption, { color: colors.featureMuted }]}>
            {d.month} · {d.weekday}
          </Text>
        </View>
      </View>
      {a.request?.status === "active" && (
        <Text style={[type.small, { color: colors.featureAccent }]}>
          代班等待中 · 目前仍由你服事
        </Text>
      )}
    </Pressable>
  );
}

export function ReplacementActions({
  assignment,
  candidates,
  memberId,
  busy,
  colors,
  onCommand,
  zone,
}: {
  assignment: Assignment;
  candidates: Candidate[];
  memberId?: string;
  busy: boolean;
  colors: Palette;
  onCommand: (action: string, extra?: Record<string, unknown>) => Promise<void>;
  zone: string;
}) {
  const [step, setStep] = useState<"choose" | "person" | "open" | null>(null);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    setStep(null);
    setQuery("");
    setTarget("");
    setFailure("");
  }, [assignment.id]);
  const active = assignment.request?.status === "active";
  // Web's snap-point drawer keeps full-viewport content below a half-height sheet.
  // Let short web sheets fit their content; native sheets retain system detents.
  const compactWebSheet = Platform.OS === "web" && step !== "person";
  const owner = memberId === assignment.assigneeMemberId;
  const peers = candidates.filter(
    (c) =>
      c.id !== memberId &&
      c.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const send = async (action: string, extra?: Record<string, unknown>) => {
    setSubmitting(true);
    setFailure("");
    try {
      await onCommand(action, extra);
      setStep(null);
      setTarget("");
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "操作未完成，請重試。");
    } finally {
      setSubmitting(false);
    }
  };
  if (assignment.cancelled || Date.parse(assignment.startsAt) <= Date.now())
    return null;
  const requestExtra = active ? { requestId: assignment.request!.id } : {};
  return (
    <View style={{ gap: space.lg }}>
      {owner ? (
        <>
          {active ? (
            <View style={[s.progress, { backgroundColor: colors.soft }]}>
              <AppIcon name="clock" color={colors.primary} />
              <View style={{ flex: 1, gap: space.xs }}>
                <Text
                  style={[type.body, { color: colors.text, fontWeight: "600" }]}
                >
                  {assignment.request!.mode === "open"
                    ? "正在向團契徵求代班"
                    : `等待 ${candidates.find((c) => c.id === assignment.request!.targetMemberId)?.name || "受邀同工"} 回覆`}
                </Text>
                <Text style={[type.small, { color: colors.muted }]}>
                  對方接受前，仍由你服事。
                </Text>
              </View>
            </View>
          ) : null}
          <Action
            title={active ? "管理代班" : "找代班"}
            secondary={active}
            onPress={() => setStep("choose")}
            colors={colors}
            disabled={busy}
          />
          {assignment.helpOpen && (
            <Text style={[type.small, { color: colors.muted }]}>
              負責人協助中
            </Text>
          )}
        </>
      ) : active &&
        (assignment.request!.mode === "open" ||
          assignment.request!.targetMemberId === memberId) ? (
        <>
          <SectionTitle
            title="代班邀請"
            subtitle="接受後，這次服事會改由你負責。"
            colors={colors}
          />
          <Action
            title="接受代班"
            onPress={() => void send("accept", requestExtra)}
            colors={colors}
            disabled={busy}
            loading={submitting}
          />
          {assignment.request!.mode === "nominated" ? (
            <Action
              title="無法代班"
              secondary
              onPress={() => void send("decline", requestExtra)}
              colors={colors}
              disabled={busy}
            />
          ) : null}
        </>
      ) : null}
      {failure && !step ? (
        <Text
          accessibilityRole="alert"
          style={[type.body, { color: colors.primary }]}
        >
          {failure}
        </Text>
      ) : null}
      <Host>
        <BottomSheet
          isPresented={step !== null}
          onDismiss={() => {
            if (!submitting) setStep(null);
          }}
          snapPoints={
            compactWebSheet
              ? undefined
              : step === "person"
                ? ["full"]
                : ["half", "full"]
          }
          containerColor={colors.surface}
          contentPadding={0}
        >
          <RNHostView matchContents={compactWebSheet} style={{ width: "100%" }}>
            <View style={{ flex: 1, padding: space.page, gap: space.lg }}>
              <View style={s.sheetHeader}>
                {step !== "choose" && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="返回代班方式"
                    disabled={submitting}
                    onPress={() => {
                      setStep("choose");
                      setFailure("");
                    }}
                    style={s.iconButton}
                  >
                    <AppIcon name="back" color={colors.muted} />
                  </Pressable>
                )}
                <Text
                  accessibilityRole="header"
                  style={[type.heading, { color: colors.text, flex: 1 }]}
                >
                  {step === "person"
                    ? "邀請同工"
                    : step === "open"
                      ? "團契徵求"
                      : active
                        ? "管理代班"
                        : "找代班"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="關閉代班選擇"
                  disabled={submitting}
                  onPress={() => setStep(null)}
                  style={s.iconButton}
                >
                  <AppIcon name="close" color={colors.muted} />
                </Pressable>
              </View>
              {step !== "choose" && (
                <View style={{ gap: space.xs }}>
                  <Text
                    style={[
                      type.body,
                      { color: colors.text, fontWeight: "600" },
                    ]}
                  >
                    {assignment.label}
                  </Text>
                  <Text style={[type.small, { color: colors.muted }]}>
                    {formatDate(assignment.startsAt, zone)}
                  </Text>
                </View>
              )}
              {step === "choose" ? (
                <ScrollView
                  contentContainerStyle={{
                    gap: space.lg,
                    paddingBottom: space.page,
                  }}
                >
                  {(["person", "open"] as const).map((mode) => (
                    <Pressable
                      key={mode}
                      accessibilityRole="button"
                      disabled={busy || submitting}
                      onPress={() => setStep(mode)}
                      style={({ pressed }) => [
                        s.choice,
                        {
                          borderColor: colors.line,
                          backgroundColor: pressed
                            ? colors.soft
                            : colors.surface,
                        },
                      ]}
                    >
                      <AppIcon
                        name={mode === "person" ? "profile" : "people"}
                        color={colors.primary}
                        size={26}
                      />
                      <View style={{ flex: 1, gap: space.xs }}>
                        <Text
                          style={[
                            type.body,
                            { color: colors.text, fontWeight: "600" },
                          ]}
                        >
                          {mode === "person" ? "邀請同工" : "團契徵求"}
                        </Text>
                      </View>
                      <AppIcon name="next" color={colors.muted} />
                    </Pressable>
                  ))}
                  <Action
                    title={
                      assignment.helpOpen ? "負責人協助中" : "請負責人協助"
                    }
                    quiet
                    colors={colors}
                    disabled={busy || submitting || assignment.helpOpen}
                    onPress={() => void send("help")}
                  />
                  {active && (
                    <Action
                      title="撤回代班請求"
                      quiet
                      colors={colors}
                      disabled={busy || submitting}
                      onPress={() => void send("withdraw", requestExtra)}
                    />
                  )}
                </ScrollView>
              ) : step === "person" ? (
                <>
                  <View style={[s.search, { backgroundColor: colors.canvas }]}>
                    <AppIcon name="search" color={colors.muted} />
                    <TextInput
                      accessibilityLabel="搜尋同工"
                      placeholder="搜尋同工姓名"
                      placeholderTextColor={colors.muted}
                      value={query}
                      onChangeText={setQuery}
                      style={[
                        type.body,
                        { color: colors.text, flex: 1, minHeight: 48 },
                      ]}
                    />
                  </View>
                  <FlatList
                    data={peers}
                    keyExtractor={(c) => c.id}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    style={{ flex: 1 }}
                    ListEmptyComponent={
                      <EmptyState
                        title="沒有符合的同工"
                        description="試試其他姓名，或改為向團契公開徵求。"
                        colors={colors}
                      />
                    }
                    renderItem={({ item: c }) => (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={c.name}
                        accessibilityState={{ checked: target === c.id }}
                        onPress={() => setTarget(c.id)}
                        style={({ pressed }) => [
                          s.choice,
                          {
                            borderColor: colors.line,
                            backgroundColor:
                              pressed || target === c.id
                                ? colors.soft
                                : colors.surface,
                          },
                        ]}
                      >
                        <Text
                          style={[type.body, { color: colors.text, flex: 1 }]}
                        >
                          {c.name}
                        </Text>
                        {target === c.id ? (
                          <AppIcon name="check" color={colors.primary} />
                        ) : null}
                      </Pressable>
                    )}
                  />
                  <Text style={[type.caption, { color: colors.muted }]}>
                    對方接受前，仍由你服事。
                  </Text>
                  <Action
                    title={
                      target
                        ? `邀請 ${candidates.find((c) => c.id === target)?.name || "同工"}`
                        : "送出邀請"
                    }
                    colors={colors}
                    disabled={!target || busy}
                    loading={submitting}
                    onPress={() =>
                      void send(active ? "switch" : "request", {
                        mode: "nominated",
                        targetMemberId: target,
                        ...requestExtra,
                      })
                    }
                  />
                </>
              ) : step === "open" ? (
                <ScrollView
                  contentContainerStyle={{
                    gap: space.lg,
                    paddingBottom: space.page,
                  }}
                >
                  <Text style={[type.body, { color: colors.muted }]}>
                    向{assignment.teamName}徵求，第一位接受者承接。
                  </Text>
                  <Text style={[type.small, { color: colors.muted }]}>
                    有人接受前，這次服事仍由你負責。
                  </Text>
                  <Action
                    title="發布徵求"
                    colors={colors}
                    disabled={busy}
                    loading={submitting}
                    onPress={() =>
                      void send(active ? "switch" : "request", {
                        mode: "open",
                        ...requestExtra,
                      })
                    }
                  />
                </ScrollView>
              ) : null}
              {failure ? (
                <Text
                  accessibilityRole="alert"
                  style={[type.body, { color: colors.primary }]}
                >
                  {failure}
                </Text>
              ) : null}
            </View>
          </RNHostView>
        </BottomSheet>
      </Host>
    </View>
  );
}
const s = StyleSheet.create({
  action: {
    minHeight: 52,
    borderRadius: 16,
    borderCurve: "continuous",
    padding: space.md,
    flexDirection: "row",
    gap: space.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  assignment: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateRail: {
    width: 52,
    alignItems: "center",
    paddingVertical: space.sm,
    borderRadius: 14,
    borderCurve: "continuous",
  },
  day: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  nextService: {
    borderRadius: 28,
    borderCurve: "continuous",
    padding: space.page,
    gap: space.lg,
  },
  heroEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: space.sm,
  },
  heroTop: { flexDirection: "row", gap: space.lg, alignItems: "flex-start" },
  heroDate: {
    minWidth: 72,
    alignItems: "center",
  },
  heroDay: {
    fontSize: 54,
    lineHeight: 58,
    fontWeight: "300",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  progress: {
    padding: space.lg,
    borderRadius: 12,
    borderCurve: "continuous",
    flexDirection: "row",
    gap: space.md,
    alignItems: "center",
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: space.sm },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: 12,
  },
});
