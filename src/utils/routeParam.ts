import { router } from "expo-router";

/** Expo Router on web can pass a dynamic segment as `string | string[]`. */
export function normalizeRouteParam(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const next = normalizeRouteParam(item);
      if (next) return next;
    }
    return "";
  }
  if (value == null) return "";
  return String(value).trim();
}

/** Safely navigate back without throwing 'GO_BACK was not handled by any navigator' if stack is empty. */
export function safeBack(fallbackRoute: string = "/(tabs)") {
  try {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // Fall through to fallback
  }
  router.replace(fallbackRoute as any);
}
