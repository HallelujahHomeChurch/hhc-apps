import React from "react";
import type { TimeControlProps } from "./time-control";
export function TimeControl({
  value,
  onChange,
  disabled,
  colors,
}: TimeControlProps) {
  return (
    <input
      type="time"
      aria-label="提醒時間"
      value={value}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value);
      }}
      style={{
        minHeight: 48,
        maxWidth: "100%",
        boxSizing: "border-box",
        border: 0,
        borderRadius: 12,
        padding: 8,
        color: colors.text,
        background: colors.canvas,
        font: "inherit",
        colorScheme: colors.canvas === "#141b21" ? "dark" : "light",
      }}
    />
  );
}
