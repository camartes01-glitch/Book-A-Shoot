/** Duration + overnight handling for event day start/end times (spec section 15). */

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}

export function durationMinutes(startTime: string, endTime: string, overnight: boolean): number {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (overnight || end <= start) {
    return 24 * 60 - start + end;
  }
  return end - start;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${h}h ${m}m`;
}

/** Whether end is chronologically after start, treating an explicit
 * `overnight` flag as "ends the next day" (spec: "For overnight events...
 * Start: 8:00 PM, End: 2:00 AM (+1 day)"). */
export function isEndAfterStart(startTime: string, endTime: string, overnight: boolean): boolean {
  if (overnight) return true;
  return toMinutes(endTime) > toMinutes(startTime);
}

/** Clock times that wrap past midnight (8:00 PM → 2:00 AM) are overnight.
 * Same-day ranges (10:00 AM → 6:00 PM) are not. */
export function inferOvernight(startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return false;
  return toMinutes(endTime) <= toMinutes(startTime);
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isPastDate(dateIso: string): boolean {
  return dateIso < todayIso();
}

export function isBeforeDate(a: string, b: string): boolean {
  return a < b;
}

export function latestDate(dates: string[]): string | null {
  const valid = dates.filter(Boolean);
  if (!valid.length) return null;
  return valid.reduce((max, d) => (d > max ? d : max));
}

/** Expo datetimepicker is native-only in SDK 57. Web booking uses HTML inputs. */
export function usesHtmlDateTimeInputs(os: string): boolean {
  return os === "web";
}

export function normalizeHtmlDateValue(raw: string): string | null {
  const value = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function normalizeHtmlTimeValue(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
