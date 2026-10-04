import React, { useRef, useState } from "react";
import { RefreshControl, type RefreshControlProps } from "react-native";

export type PullToRefreshProps = Pick<
  RefreshControlProps,
  "style" | "children"
> & {
  onRefresh: () => Promise<void>;
  tintColor: string;
  enabled?: boolean;
};

// Only a user-initiated pull owns this spinner, not saves or background loading.
export function PullToRefresh({
  onRefresh,
  tintColor,
  enabled = true,
  style,
  children,
}: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const pending = useRef(false);
  return (
    <RefreshControl
      style={style}
      children={children}
      refreshing={refreshing}
      enabled={enabled}
      tintColor={tintColor}
      colors={[tintColor]}
      onRefresh={async () => {
        if (!enabled || pending.current) return;
        pending.current = true;
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          pending.current = false;
          setRefreshing(false);
        }
      }}
    />
  );
}
