import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolView } from "expo-symbols";
import { BottomSheet, Host } from "@expo/ui";
import type { Assignment, Candidate } from "./api";
import { Palette, space, type } from "./theme";

// Native detail presentation; web stays in-tree so Expo's sheet portal remains above it.
export function DetailScreen({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const surface = useRef<View>(null);
  useEffect(() => {
    if (visible && Platform.OS === "web") surface.current?.focus();
  }, [visible]);
  if (Platform.OS !== "web")
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        {children}
      </Modal>
    );
  return visible ? (
    <View
      ref={surface}
      role="dialog"
      aria-label="服事詳情"
      tabIndex={-1}
      style={StyleSheet.absoluteFill}
    >
      {children}
    </View>
  ) : null;
}

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
export function Action({
  title,
  onPress,
  colors,
  secondary = false,
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  colors: Palette;
  secondary?: boolean;
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
          backgroundColor: secondary ? colors.soft : colors.primary,
          opacity: disabled || loading ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={secondary ? colors.primary : colors.onPrimary}
        />
      ) : null}
      <Text
        style={[
          type.body,
          {
            fontWeight: "600",
            color: secondary ? colors.primary : colors.onPrimary,
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
  description: string;
  colors: Palette;
}) {
  return (
    <View style={{ paddingVertical: space.page, gap: space.sm }}>
      <AppIcon name="check" color={colors.muted} size={28} />
      <Text style={[type.body, { color: colors.text, fontWeight: "600" }]}>
        {title}
      </Text>
      <Text style={[type.small, { color: colors.muted }]}>{description}</Text>
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
}: {
  assignment: Assignment;
  colors: Palette;
  zone: string;
  onPress: () => void;
  viewerId?: string;
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
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
        >
          <View style={[s.avatar, { backgroundColor: colors.soft }]}>
            <Text style={[type.caption, { color: colors.primary }]}>
              {a.assigneeName?.slice(0, 1) || "—"}
            </Text>
          </View>
          <Text style={[type.small, { color: colors.muted }]}>
            {a.assigneeName || (a.assigneeMemberId ? "已安排同工" : "待補人選")}
          </Text>
        </View>
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
        <Text style={[type.caption, { color: colors.featureMuted }]}>
          {a.teamName}
        </Text>
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
      <View style={[s.heroFooter, { borderColor: colors.featureLine }]}>
        <View style={{ flex: 1, gap: space.xs }}>
          <Text style={[type.small, { color: colors.featureText }]}>
            {a.request?.status === "active"
              ? "代班尚未完成，這次仍由你服事"
              : "查看服事安排"}
          </Text>
        </View>
        <View style={[s.heroArrow, { backgroundColor: colors.featureAccent }]}>
          <AppIcon name="next" color={colors.feature} size={20} />
        </View>
      </View>
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
}: {
  assignment: Assignment;
  candidates: Candidate[];
  memberId?: string;
  busy: boolean;
  colors: Palette;
  onCommand: (action: string, extra?: Record<string, unknown>) => Promise<void>;
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
          <SectionTitle
            title={active ? "代班進度" : "需要調整這次服事？"}
            subtitle={
              active
                ? "同工接受前，這次服事仍由你負責。"
                : "可以邀請同團契的同工，或請負責人協助。"
            }
            colors={colors}
          />
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
                  接受後會更新班表，不需要另外審批。
                </Text>
              </View>
            </View>
          ) : null}
          <Action
            title={active ? "更換代班方式" : "找同工代班"}
            onPress={() => setStep("choose")}
            colors={colors}
            disabled={busy}
          />
          {active ? (
            <Action
              title="撤回代班請求"
              secondary
              onPress={() => void send("withdraw", requestExtra)}
              colors={colors}
              disabled={busy}
            />
          ) : null}
          <Action
            title={assignment.helpOpen ? "已請負責人協助" : "請團契負責人協助"}
            secondary
            onPress={() => void send("help")}
            colors={colors}
            disabled={busy || assignment.helpOpen}
          />
        </>
      ) : active &&
        (assignment.request!.mode === "open" ||
          assignment.request!.targetMemberId === memberId) ? (
        <>
          <SectionTitle
            title="你可以接下這次服事嗎？"
            subtitle="確認日期與任務；接受後班表會直接更新為你。"
            colors={colors}
          />
          <Action
            title="確認接受這次服事"
            onPress={() => void send("accept", requestExtra)}
            colors={colors}
            disabled={busy}
            loading={submitting}
          />
          {assignment.request!.mode === "nominated" ? (
            <Action
              title="這次無法代班"
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
          snapPoints={["full"]}
          containerColor={colors.surface}
          contentPadding={0}
        >
          <View style={{ flex: 1, padding: space.page, gap: space.lg }}>
            <View style={s.sheetHeader}>
              <Text
                accessibilityRole="header"
                style={[type.heading, { color: colors.text, flex: 1 }]}
              >
                {step === "person"
                  ? "邀請一位同工"
                  : step === "open"
                    ? "向團契公開徵求"
                    : "找同工代班"}
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
            {step === "choose" ? (
              <>
                <Text style={[type.body, { color: colors.muted }]}>
                  選擇適合的方式。同工接受前，原本的安排保持不變。
                </Text>
                {(["person", "open"] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    onPress={() => setStep(mode)}
                    style={({ pressed }) => [
                      s.choice,
                      {
                        borderColor: colors.line,
                        backgroundColor: pressed ? colors.soft : colors.surface,
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
                        {mode === "person" ? "邀請指定同工" : "向團契公開徵求"}
                      </Text>
                      <Text style={[type.small, { color: colors.muted }]}>
                        {mode === "person"
                          ? "選擇一位同團契成員，等待對方回覆。"
                          : "讓團契同工看見，第一位接受者承接。"}
                      </Text>
                    </View>
                    <AppIcon name="next" color={colors.muted} />
                  </Pressable>
                ))}
              </>
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
                <Action
                  title={
                    target
                      ? `邀請 ${candidates.find((c) => c.id === target)?.name || "同工"}`
                      : "請先選擇一位同工"
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
              <>
                <Text style={[type.body, { color: colors.muted }]}>
                  這則徵求會讓「{assignment.teamName}
                  」的同工看見。第一位成功接受的同工會承接這次服事。
                </Text>
                <Text style={[type.heading, { color: colors.text }]}>
                  {assignment.label}
                </Text>
                <Text style={[type.small, { color: colors.muted }]}>
                  有人接受前，這次服事仍由你負責。
                </Text>
                <Action
                  title="確認公開徵求"
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
              </>
            ) : null}
            {failure ? (
              <Text
                accessibilityRole="alert"
                style={[type.body, { color: colors.primary }]}
              >
                {failure}
              </Text>
            ) : null}
            {step !== "choose" ? (
              <Action
                title="返回選擇方式"
                secondary
                colors={colors}
                disabled={submitting}
                onPress={() => {
                  setStep("choose");
                  setFailure("");
                }}
              />
            ) : null}
          </View>
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
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
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
  heroArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.lg,
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
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
