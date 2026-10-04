import React, { useState } from "react";
import { Platform, Pressable, Text } from "react-native";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { clockDate, clockValue } from "./presentation";
import { Palette, type } from "./theme";
export type TimeControlProps = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  colors: Palette;
};
export function TimeControl({
  value,
  onChange,
  disabled,
  colors,
}: TimeControlProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {Platform.OS === "android" && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`提醒時間 ${value}`}
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={{ minHeight: 48, justifyContent: "center" }}
        >
          <Text style={[type.body, { color: colors.primary }]}>{value}</Text>
        </Pressable>
      )}
      {(Platform.OS === "ios" || open) && (
        <DateTimePicker
          value={clockDate(value)}
          mode="time"
          display="compact"
          locale="zh_TW"
          disabled={disabled}
          accentColor={colors.primary}
          themeVariant={colors.scheme}
          positiveButton={{ label: "確定" }}
          negativeButton={{ label: "取消" }}
          onDismiss={() => setOpen(false)}
          onValueChange={(_, date) => {
            onChange(clockValue(date));
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
