import { useEffect, useRef, useState } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

type Mode = "light" | "dark";
const key = "hhc-appearance";
const isMode = (value: unknown): value is Mode =>
  value === "light" || value === "dark";

export function useAppearance() {
  const system = useColorScheme();
  const [selected, setSelected] = useState<Mode | null>(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return null;
    try {
      const value = localStorage.getItem(key);
      return isMode(value) ? value : null;
    } catch {
      return null;
    }
  });
  const interacted = useRef(false);
  const writes = useRef(Promise.resolve());
  const mode = selected ?? (system === "dark" ? "dark" : "light");
  const current = useRef(mode);
  current.current = mode;
  useEffect(() => {
    if (Platform.OS === "web") return;
    let alive = true;
    void SecureStore.getItemAsync(key)
      .then((value) => {
        if (alive && !interacted.current && isMode(value)) setSelected(value);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") {
      if (typeof document !== "undefined") {
        document.documentElement.style.colorScheme = mode;
        // Expo UI's web variables use the root data-theme to override OS preference.
        document.documentElement.dataset.theme = mode;
      }
    } else {
      Appearance.setColorScheme(selected ?? "unspecified");
    }
  }, [mode, selected]);
  function toggleAppearance() {
    interacted.current = true;
    const next = current.current === "dark" ? "light" : "dark";
    current.current = next;
    setSelected(next);
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, next);
      } catch {
        /* Keep the in-memory choice when storage is unavailable. */
      }
    } else {
      // Preserve tap order even if native storage takes longer than a render.
      writes.current = writes.current
        .then(() => SecureStore.setItemAsync(key, next))
        .catch(() => {});
    }
  }
  return { mode, toggleAppearance };
}
