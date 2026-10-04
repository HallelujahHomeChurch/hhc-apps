import React from "react";
import { Host, DatePicker } from "@expo/ui/swift-ui";
import {
  datePickerStyle,
  disabled as disabledModifier,
  environment,
  labelsHidden,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { clockDate, clockValue } from "./presentation";
import type { TimeControlProps } from "./time-control";
export function TimeControl({
  value,
  onChange,
  disabled,
  colors,
}: TimeControlProps) {
  return (
    <Host matchContents colorScheme={colors.scheme} ignoreSafeArea="all">
      <DatePicker
        title="提醒時間"
        selection={clockDate(value)}
        displayedComponents={["hourAndMinute"]}
        onDateChange={(date) => onChange(clockValue(date))}
        modifiers={[
          datePickerStyle("compact"),
          labelsHidden(),
          tint(colors.primary),
          environment("locale", "zh_TW"),
          disabledModifier(disabled),
        ]}
      />
    </Host>
  );
}
