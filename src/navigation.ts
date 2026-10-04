// Keep issued service links working after migrating from a single-screen app.
export function systemPath(path: string) {
  try {
    const url = new URL(path, "hhc-app://app");
    const route =
      url.protocol === "hhc-app:" && url.hostname !== "app"
        ? `/${url.hostname}${url.pathname}`
        : url.pathname;
    const match = route.match(
      /^\/(?:service|assignment)\/([0-9a-f-]{36})\/?$/i,
    );
    if (match) return `/assignment/${match[1]}`;
    if (route === "/auth/account") return "/";
    return path;
  } catch {
    return "/";
  }
}
