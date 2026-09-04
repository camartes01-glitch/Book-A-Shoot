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
