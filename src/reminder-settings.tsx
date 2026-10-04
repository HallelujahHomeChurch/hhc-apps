import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BottomSheet,
  Host,
  Picker,
  Switch,
  ListItem,
  RNHostView,
} from "@expo/ui";
import type { Preference } from "./api";
import { useService } from "./service-state";
import { Action, AppIcon, SectionTitle } from "./service-ui";
import {
  dayLabel,
  matchesZone,
  validPreference,
  zoneLabel,
  zoneOptions,
} from "./presentation";
import { TimeControl } from "./time-control";
import { Palette, space, type } from "./theme";

export function ReminderSettings({ preference }: { preference: Preference }) {
  const {
    colors,
    savePreference,
    displayZone,
    setDisplayZone,
    permission,
    enablePush,
    logout,
  } = useService();
  const [draft, setDraft] = useState(preference);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [zoneFor, setZoneFor] = useState<"reminder" | "display" | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!dirty) setDraft(preference);
    else if (preference.version > draft.version) {
      setDraft((current) => ({ ...current, version: preference.version }));
      setFeedback("設定已有更新；已保留你的選擇，請確認後儲存。");
    }
  }, [preference, dirty, draft.version]);
  const edit = (next: Partial<Preference>) => {
    setDraft((p) => ({ ...p, ...next }));
    setDirty(true);
    setFeedback("");
  };
  const currentZone = zoneFor === "display" ? displayZone : draft.timeZone;
  const zones = useMemo(() => zoneOptions(currentZone), [currentZone]);
  const openZone = (target: "reminder" | "display") => {
    setQuery("");
    setZoneFor(target);
  };
  const save = async () => {
    if (saving) return;
    if (!validPreference(draft)) {
      setFailed(true);
      setFeedback("請選擇有效的提醒時間與時區。");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const p = await savePreference(draft);
      setDraft(p);
      setDirty(false);
      setFailed(false);
      setFeedback("提醒已儲存");
    } catch (e) {
      setFailed(true);
      setFeedback(e instanceof Error ? e.message : "尚未儲存，請重試。");
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={{ gap: space.lg }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 22,
          padding: space.lg,
          gap: space.md,
        }}
      >
        <View pointerEvents={saving ? "none" : "auto"}>
          <Host
            seedColor={colors.primary}
            matchContents={{ vertical: true }}
            style={{ width: "100%" }}
          >
            <Switch
              label="服事提醒"
              disabled={saving}
              value={draft.enabled}
              onValueChange={(enabled) => {
                if (!saving) edit({ enabled });
              }}
            />
          </Host>
        </View>
        {draft.enabled && (
          <>
            <View style={{ gap: space.sm }}>
              <Text style={[type.small, { color: colors.muted }]}>
                提醒日期
              </Text>
              {Platform.OS === "web" ? (
                <select
                  aria-label="提醒日期"
                  data-testid="reminder-days"
                  value={draft.leadDays}
                  disabled={saving}
                  onChange={(e) => edit({ leadDays: Number(e.target.value) })}
                  style={{
                    minHeight: 48,
                    border: 0,
                    borderRadius: 12,
                    padding: 8,
                    color: colors.text,
                    background: colors.canvas,
                    font: "inherit",
                  }}
                >
                  {Array.from({ length: 8 }, (_, i) => (
                    <option key={i} value={i}>
                      {dayLabel(i)}
                    </option>
                  ))}
                </select>
              ) : (
                <Host
                  seedColor={colors.primary}
                  matchContents={{ vertical: true }}
                  style={{ width: "100%" }}
                >
                  <Picker
                    selectedValue={draft.leadDays}
                    onValueChange={(leadDays) => edit({ leadDays })}
                    enabled={!saving}
                    testID="reminder-days"
                  >
                    {Array.from({ length: 8 }, (_, i) => (
                      <Picker.Item key={i} value={i} label={dayLabel(i)} />
                    ))}
                  </Picker>
                </Host>
              )}
            </View>
            <View style={{ gap: space.sm }}>
              <Text style={[type.small, { color: colors.muted }]}>
                提醒時間
              </Text>
              <TimeControl
                value={draft.localTime}
                onChange={(localTime) => edit({ localTime })}
                disabled={saving}
                colors={colors}
              />
            </View>
            <SettingsRow
              title="提醒時區"
              value={`${zoneLabel(draft.timeZone)}時間`}
              onPress={() => {
                if (!saving) openZone("reminder");
              }}
              colors={colors}
            />
          </>
        )}
      </View>
      {dirty && (
        <>
          <Text
            accessibilityLiveRegion="polite"
            style={[type.caption, { color: colors.muted }]}
          >
            尚未儲存
          </Text>
          <Action
            title="儲存提醒"
            colors={colors}
            onPress={() => void save()}
            loading={saving}
          />
        </>
      )}
      {!!feedback && (
        <Text
          accessibilityRole={failed ? "alert" : undefined}
          accessibilityLiveRegion="polite"
          style={[
            type.small,
            { color: failed ? colors.primary : colors.success },
          ]}
        >
          {feedback}
        </Text>
      )}
      <SectionTitle title="顯示與通知" colors={colors} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 22,
          padding: space.lg,
          gap: space.lg,
        }}
      >
        <SettingsRow
          title="班表顯示時區"
          value={`${zoneLabel(displayZone)}時間`}
          onPress={() => openZone("display")}
          colors={colors}
        />
        <SettingsRow
          title="手機通知"
          value={permission}
          onPress={
            permission === "已啟用" ? undefined : () => void enablePush()
          }
          colors={colors}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void logout()}
        style={{
          minHeight: 48,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={[type.body, { color: colors.muted }]}>登出</Text>
      </Pressable>
      <Host>
        <BottomSheet
          isPresented={zoneFor !== null}
          onDismiss={() => setZoneFor(null)}
          snapPoints={["full"]}
          containerColor={colors.surface}
          contentPadding={0}
        >
          <RNHostView>
            <View style={{ flex: 1, padding: space.page, gap: space.lg }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                }}
              >
                <Text
                  accessibilityRole="header"
                  style={[type.heading, { color: colors.text, flex: 1 }]}
                >
                  {zoneFor === "reminder" ? "提醒時區" : "班表顯示時區"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="關閉時區選擇"
                  onPress={() => setZoneFor(null)}
                  style={{
                    minWidth: 48,
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppIcon name="close" color={colors.muted} />
                </Pressable>
              </View>
              {zoneFor === "reminder" && (
                <Text style={[type.small, { color: colors.muted }]}>
                  所有裝置共用；旅行時仍依選定時區提醒。
                </Text>
              )}
              <TextInput
                accessibilityLabel="搜尋城市或時區"
                placeholder="搜尋城市或時區"
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                style={[
                  type.body,
                  {
                    minHeight: 48,
                    padding: space.md,
                    backgroundColor: colors.canvas,
                    color: colors.text,
                    borderRadius: 12,
                  },
                ]}
              />
              <FlatList
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                data={zones.filter((z) => matchesZone(z, query))}
                keyExtractor={(z) => z}
                ListEmptyComponent={
                  <Text style={[type.body, { color: colors.muted }]}>
                    找不到這個城市，試試英文名稱。
                  </Text>
                }
                renderItem={({ item: z }) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={zoneLabel(z)}
                    accessibilityState={{ checked: z === currentZone }}
                    onPress={() => {
                      if (zoneFor === "display") setDisplayZone(z);
                      else edit({ timeZone: z });
                      setZoneFor(null);
                    }}
                    style={{
                      minHeight: 64,
                      paddingVertical: space.md,
                      borderBottomWidth: 0.5,
                      borderColor: colors.line,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space.md,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[type.body, { color: colors.text }]}>
                        {zoneLabel(z)}
                      </Text>
                      <Text style={[type.caption, { color: colors.muted }]}>
                        {z}
                      </Text>
                    </View>
                    {z === currentZone && (
                      <AppIcon name="check" color={colors.primary} />
                    )}
                  </Pressable>
                )}
              />
            </View>
          </RNHostView>
        </BottomSheet>
      </Host>
    </View>
  );
}

// Expo UI's web ListItem has no button semantics; use the native row on devices.
function SettingsRow({
  title,
  value,
  onPress,
  colors,
}: {
  title: string;
  value: string;
  onPress?: () => void;
  colors: Palette;
}) {
  if (Platform.OS === "web")
    return (
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={`${title}，${value}`}
        disabled={!onPress}
        onPress={onPress}
        style={{
          minHeight: 56,
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
        }}
      >
        <View style={{ flex: 1, gap: space.xs }}>
          <Text style={[type.body, { color: colors.text }]}>{title}</Text>
          <Text style={[type.small, { color: colors.muted }]}>{value}</Text>
        </View>
        {onPress && <AppIcon name="next" color={colors.muted} size={18} />}
      </Pressable>
    );
  return (
    <Host
      seedColor={colors.primary}
      matchContents={{ vertical: true }}
      style={{ width: "100%" }}
    >
      <ListItem
        onPress={onPress}
        supportingText={value}
        trailing={
          onPress ? (
            <AppIcon name="next" color={colors.muted} size={18} />
          ) : undefined
        }
      >
        {title}
      </ListItem>
    </Host>
  );
}
