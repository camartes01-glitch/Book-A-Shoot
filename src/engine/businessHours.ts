/**
 * Business Hours SLA Engine for Camartes & Book A Shoot
 *
 * Operating Window: 9:00 AM to 9:00 PM (12 hours / 720 active minutes daily)
 * SLA Response Window: 60 active business minutes
 * Default Timezone: Asia/Kolkata (IST = UTC + 05:30)
 *
 * Rules:
 * 1. Requests placed outside business hours (e.g., 10:00 PM or 7:00 AM) are queued.
 *    The 60-minute SLA countdown starts strictly at 9:00 AM.
 * 2. Requests placed between 9:00 AM and 8:00 PM have an immediate 60-minute window today.
 * 3. Requests placed late in the day (e.g. 8:30 PM) consume the active minutes left today
 *    (30 mins until 9:00 PM), and roll over the remaining minutes to the next day
 *    starting at 9:00 AM (e.g. expires at 9:30 AM tomorrow).
 * 4. High-performance, O(1) mathematical calculation, zero memory leaks, thread-safe.
 */

export interface BusinessHoursConfig {
  /** Hour when operating window opens (0-23, default: 9 for 9:00 AM) */
  windowStartHour?: number;
  /** Hour when operating window closes (0-23, default: 21 for 9:00 PM) */
  windowEndHour?: number;
  /** Response time limit in active business minutes (default: 60) */
  limitMinutes?: number;
  /** Timezone offset in minutes (default: 330 for UTC+05:30 / Asia/Kolkata) */
  timezoneOffsetMinutes?: number;
}

export type SlaPhase = "QUEUED_NIGHT" | "ACTIVE" | "PAUSED_OVERNIGHT" | "EXPIRED";

export interface BusinessSlaResult {
  /** Timestamp when the request was assigned to the firm */
  assignedAt: Date;
  /** Exact timestamp when the 60-minute SLA countdown officially starts */
  activeFrom: Date;
  /** Exact timestamp when the request times out if not accepted */
  expiresAt: Date;
  /** Whether the request has expired as of `now` */
  isExpired: boolean;
  /** Current lifecycle phase as of `now` */
  phase: SlaPhase;
  /** Active business minutes remaining (0 to 60) */
  remainingMinutes: number;
  /** Human-readable status badge text (e.g. "Starts 9:00 AM", "42m left", "Paused (Night)") */
  badgeText: string;
  /** Detailed human-friendly hint/explanation */
  hintText: string;
}

export const DEFAULT_WINDOW_START_HOUR = 9;   // 9:00 AM
export const DEFAULT_WINDOW_END_HOUR = 21;    // 9:00 PM
export const DEFAULT_SLA_MINUTES = 60;        // 60 minutes
export const DEFAULT_IST_OFFSET_MINUTES = 330; // UTC+05:30 (India Standard Time)

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Converts a UTC Date/timestamp into local date components using timezone offset.
 */
function getLocalComponents(date: Date, offsetMinutes: number) {
  const localMs = date.getTime() + offsetMinutes * MS_PER_MINUTE;
  const d = new Date(localMs);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    date: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds(),
    milliseconds: d.getUTCMilliseconds(),
  };
}

/**
 * Creates a UTC Date given local date components and timezone offset.
 */
function makeUtcFromLocal(
  year: number,
  month: number,
  date: number,
  hours: number,
  minutes: number,
  seconds: number,
  offsetMinutes: number
): Date {
  const utcMs = Date.UTC(year, month, date, hours, minutes, seconds) - offsetMinutes * MS_PER_MINUTE;
  return new Date(utcMs);
}

/**
 * Formats a local time as "9:00 AM" or "9:30 AM".
 */
export function formatLocalTime12h(date: Date, offsetMinutes: number = DEFAULT_IST_OFFSET_MINUTES): string {
  const { hours, minutes } = getLocalComponents(date, offsetMinutes);
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const mStr = String(minutes).padStart(2, "0");
  return `${h12}:${mStr} ${period}`;
}

/**
 * Pure, high-performance function to calculate the exact SLA expiration
 * and active window for a booking request.
 *
 * @param assignedTime Timestamp or Date when the request was assigned to the firm
 * @param config Optional customization of hours or SLA limit
 */
export function calculateBusinessSla(
  assignedTime: Date | string | number,
  nowTime: Date | string | number = Date.now(),
  config?: BusinessHoursConfig
): BusinessSlaResult {
  const startHour = config?.windowStartHour ?? DEFAULT_WINDOW_START_HOUR;
  const endHour = config?.windowEndHour ?? DEFAULT_WINDOW_END_HOUR;
  const slaMinutes = config?.limitMinutes ?? DEFAULT_SLA_MINUTES;
  const offsetMin = config?.timezoneOffsetMinutes ?? DEFAULT_IST_OFFSET_MINUTES;

  const assignedAt = typeof assignedTime === "object" ? assignedTime : new Date(assignedTime);
  const now = typeof nowTime === "object" ? nowTime : new Date(nowTime);

  const local = getLocalComponents(assignedAt, offsetMin);
  const currentMinuteOfDay = local.hours * 60 + local.minutes + local.seconds / 60;
  const windowOpenMinute = startHour * 60;
  const windowCloseMinute = endHour * 60;

  let activeFrom: Date;
  let expiresAt: Date;

  if (currentMinuteOfDay < windowOpenMinute) {
    // Case 1: Assigned before 9:00 AM today (e.g., 6:30 AM or 8:15 AM)
    // SLA starts at 9:00 AM today, expires at 9:00 AM + slaMinutes
    activeFrom = makeUtcFromLocal(local.year, local.month, local.date, startHour, 0, 0, offsetMin);
    const expireHour = startHour + Math.floor(slaMinutes / 60);
    const expireMin = slaMinutes % 60;
    expiresAt = makeUtcFromLocal(local.year, local.month, local.date, expireHour, expireMin, 0, offsetMin);
  } else if (currentMinuteOfDay >= windowCloseMinute) {
    // Case 2: Assigned at or after 9:00 PM today (e.g., 10:00 PM, 11:30 PM)
    // SLA starts at 9:00 AM tomorrow, expires at 9:00 AM + slaMinutes tomorrow
    // Move to next day (Date.UTC handles month/year roll-over cleanly)
    const nextDayUtc = makeUtcFromLocal(local.year, local.month, local.date + 1, startHour, 0, 0, offsetMin);
    activeFrom = nextDayUtc;
    const expireHour = startHour + Math.floor(slaMinutes / 60);
    const expireMin = slaMinutes % 60;
    expiresAt = makeUtcFromLocal(local.year, local.month, local.date + 1, expireHour, expireMin, 0, offsetMin);
  } else {
    // Case 3: Assigned during business hours (9:00 AM to 9:00 PM)
    activeFrom = assignedAt;
    const minutesLeftToday = windowCloseMinute - currentMinuteOfDay;

    if (minutesLeftToday >= slaMinutes) {
      // Sufficient time today: expires today
      expiresAt = new Date(assignedAt.getTime() + slaMinutes * MS_PER_MINUTE);
    } else {
      // Rollover: consumes remaining minutes today, remainder rolled to tomorrow 9:00 AM
      const rolloverMinutes = slaMinutes - Math.floor(minutesLeftToday);
      const expireHour = startHour + Math.floor(rolloverMinutes / 60);
      const expireMin = rolloverMinutes % 60;
      // Fractional seconds retained for exact precision
      const remainingSeconds = Math.round((slaMinutes - minutesLeftToday - Math.floor(slaMinutes - minutesLeftToday)) * 60);
      expiresAt = makeUtcFromLocal(local.year, local.month, local.date + 1, expireHour, expireMin, remainingSeconds, offsetMin);
    }
  }

  // Determine current lifecycle state as of `now`
  const nowMs = now.getTime();
  const activeFromMs = activeFrom.getTime();
  const expiresAtMs = expiresAt.getTime();

  let phase: SlaPhase;
  let remainingMinutes: number;
  let badgeText: string;
  let hintText: string;

  if (nowMs >= expiresAtMs) {
    phase = "EXPIRED";
    remainingMinutes = 0;
    badgeText = "Timed Out";
    hintText = `Response window closed at ${formatLocalTime12h(expiresAt, offsetMin)}`;
  } else if (nowMs < activeFromMs) {
    // Queued before the window opens (overnight or early morning)
    phase = "QUEUED_NIGHT";
    remainingMinutes = slaMinutes;
    const openTimeStr = formatLocalTime12h(activeFrom, offsetMin);
    badgeText = `Starts ${openTimeStr}`;
    hintText = `Business hours: 9 AM - 9 PM · 60m timer starts at ${openTimeStr}`;
  } else {
    // Between activeFrom and expiresAt
    const nowLocal = getLocalComponents(now, offsetMin);
    const nowMinuteOfDay = nowLocal.hours * 60 + nowLocal.minutes + nowLocal.seconds / 60;
    const isInsideOperatingHours = nowMinuteOfDay >= windowOpenMinute && nowMinuteOfDay < windowCloseMinute;

    if (!isInsideOperatingHours) {
      // Overnight pause for late-evening rollovers (e.g. booked at 8:30 PM, currently 11:00 PM)
      phase = "PAUSED_OVERNIGHT";
      // Remaining minutes tomorrow = expiresAt - tomorrow 9:00 AM
      const nextOpenUtc = makeUtcFromLocal(nowLocal.year, nowLocal.month, nowLocal.hours >= endHour ? nowLocal.date + 1 : nowLocal.date, startHour, 0, 0, offsetMin);
      remainingMinutes = Math.max(0, Math.round((expiresAtMs - nextOpenUtc.getTime()) / MS_PER_MINUTE));
      badgeText = "Paused (Night)";
      hintText = `SLA paused · ${remainingMinutes}m remaining · Resumes at 9:00 AM`;
    } else {
      phase = "ACTIVE";
      // Calculate active business minutes left
      const expiresLocal = getLocalComponents(expiresAt, offsetMin);
      const isExpiresSameDay = expiresLocal.date === nowLocal.date && expiresLocal.month === nowLocal.month;

      if (isExpiresSameDay) {
        remainingMinutes = Math.max(0, Math.ceil((expiresAtMs - nowMs) / MS_PER_MINUTE));
      } else {
        // Multi-day rollover during daytime (e.g. currently 8:45 PM, expires 9:30 AM tomorrow)
        const minsUntilCloseToday = Math.max(0, (windowCloseMinute - nowMinuteOfDay));
        const tomorrowOpenUtc = makeUtcFromLocal(nowLocal.year, nowLocal.month, nowLocal.date + 1, startHour, 0, 0, offsetMin);
        const minsTomorrow = Math.max(0, (expiresAtMs - tomorrowOpenUtc.getTime()) / MS_PER_MINUTE);
        remainingMinutes = Math.max(0, Math.ceil(minsUntilCloseToday + minsTomorrow));
      }

      const expiryStr = formatLocalTime12h(expiresAt, offsetMin);
      badgeText = remainingMinutes === 1 ? "1 min left" : `${remainingMinutes}m left`;
      hintText = `Awaiting response · Expires at ${expiryStr}`;
    }
  }

  return {
    assignedAt,
    activeFrom,
    expiresAt,
    isExpired: nowMs >= expiresAtMs,
    phase,
    remainingMinutes,
    badgeText,
    hintText,
  };
}

/**
 * Lightweight, O(1) check to see if a firm has timed out under the 9 AM - 9 PM SLA rule.
 * Useful in tight loops or polling ticks.
 */
export function hasFirmTimedOut(
  assignedAt: Date | string | number | undefined,
  nowTime: Date | string | number = Date.now(),
  config?: BusinessHoursConfig
): boolean {
  if (!assignedAt) return false;
  const { isExpired } = calculateBusinessSla(assignedAt, nowTime, config);
  return isExpired;
}
