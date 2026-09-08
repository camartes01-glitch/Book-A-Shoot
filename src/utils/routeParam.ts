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
