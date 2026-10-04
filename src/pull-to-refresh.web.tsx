import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { AppIcon } from "./service-ui";
import type { PullToRefreshProps } from "./pull-to-refresh";

// RN Web's RefreshControl is a no-op. ScrollView passes its scroll node as children.
// Keep the preview's touch interaction here; devices use the system control.
export function PullToRefresh({
  onRefresh,
  tintColor,
  enabled = true,
  children,
  style,
}: PullToRefreshProps & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pending = useRef(false);
  const latest = useRef({ onRefresh, enabled });
  latest.current = { onRefresh, enabled };
  useEffect(() => {
    const wrapper = root.current!;
    const scroll = wrapper.lastElementChild as HTMLElement;
    let start: { x: number; y: number } | null = null;
    let distance = 0;
    const reset = () => {
      start = null;
      distance = 0;
      setPull(0);
    };
    const begin = (e: TouchEvent) => {
      reset();
      if (
        !latest.current.enabled ||
        pending.current ||
        scroll.scrollTop > 0 ||
        e.touches.length !== 1
      )
        return;
      if (
        (e.target as Element).closest(
          'input, select, textarea, [role="switch"]',
        )
      )
        return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      if (e.touches.length !== 1 || scroll.scrollTop > 0) {
        reset();
        return;
      }
      const dx = e.touches[0].clientX - start.x;
      const dy = e.touches[0].clientY - start.y;
      if (dy < 0 || Math.abs(dx) > Math.abs(dy)) {
        reset();
        return;
      }
      if (dy > 5) e.preventDefault();
      distance = Math.min(88, dy * 0.5);
      setPull(distance);
    };
    const end = async () => {
      const shouldRefresh =
        distance >= 64 && latest.current.enabled && !pending.current;
      reset();
      if (!shouldRefresh) return;
      pending.current = true;
      setRefreshing(true);
      try {
        await latest.current.onRefresh();
      } finally {
        pending.current = false;
        setRefreshing(false);
      }
    };
    // Bound to this scroll container, never the document or a sheet's city list.
    scroll.style.overscrollBehaviorY = "contain";
    scroll.addEventListener("touchstart", begin, { passive: true });
    scroll.addEventListener("touchmove", move, { passive: false });
    scroll.addEventListener("touchend", end);
    scroll.addEventListener("touchcancel", reset);
    return () => {
      scroll.removeEventListener("touchstart", begin);
      scroll.removeEventListener("touchmove", move);
      scroll.removeEventListener("touchend", end);
      scroll.removeEventListener("touchcancel", reset);
    };
  }, []);
  const containerStyle = StyleSheet.flatten(style) as React.CSSProperties;
  return (
    <div
      ref={root}
      style={{
        ...containerStyle,
        position: "relative",
        display: containerStyle?.display ?? "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        role="status"
        aria-label={
          refreshing ? "正在更新" : pull >= 64 ? "放開以更新" : "下拉以更新"
        }
        aria-hidden={!pull && !refreshing}
        data-testid="pull-indicator"
        style={{
          height: refreshing ? 56 : pull,
          flexShrink: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {refreshing ? (
          <ActivityIndicator color={tintColor} />
        ) : (
          <div
            style={{
              transform: `rotate(${Math.min(pull / 64, 1) * 180}deg)`,
              opacity: Math.min(pull / 64, 1),
            }}
          >
            <AppIcon name="refresh" color={tintColor} />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
