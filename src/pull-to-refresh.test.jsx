import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("react-native", () => ({
  RefreshControl: ({ children, style }) => <div style={style}>{children}</div>,
}));
import { PullToRefresh } from "./pull-to-refresh";

it("preserves Android ScrollView's injected layout and scroll content", () => {
  // Android clones refreshControl as the scroll container's parent (iOS doesn't).
  const element = React.cloneElement(
    <PullToRefresh onRefresh={async () => {}} tintColor="#a44740" />,
    { style: { flex: 1 } },
    <span>班表內容</span>,
  );
  expect(renderToStaticMarkup(element)).toContain(
    'style="flex:1"><span>班表內容</span>',
  );
});
