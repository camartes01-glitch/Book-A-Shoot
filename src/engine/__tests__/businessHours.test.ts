import { calculateBusinessSla, formatLocalTime12h, hasFirmTimedOut, DEFAULT_IST_OFFSET_MINUTES } from "../businessHours";

// Helper to make a UTC Date from an IST local date and time string: "2026-10-15 14:00:00"
function makeIstDate(year: number, month: number, day: number, hour: number, minute: number, second: number = 0): Date {
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - DEFAULT_IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}

describe("businessHours SLA Engine", () => {
  describe("formatLocalTime12h", () => {
    test("formats 9:00 AM and 9:00 PM correctly in IST", () => {
      const nineAm = makeIstDate(2026, 10, 15, 9, 0);
      expect(formatLocalTime12h(nineAm)).toBe("9:00 AM");

      const ninePm = makeIstDate(2026, 10, 15, 21, 0);
      expect(formatLocalTime12h(ninePm)).toBe("9:00 PM");

      const twoThirtyPm = makeIstDate(2026, 10, 15, 14, 30);
      expect(formatLocalTime12h(twoThirtyPm)).toBe("2:30 PM");
    });
  });

  describe("Daytime bookings (9:00 AM to 8:00 PM)", () => {
    test("Request at 2:00 PM has immediate activeFrom and expires at 3:00 PM same day", () => {
      const assigned = makeIstDate(2026, 10, 15, 14, 0);
      const evalTime = makeIstDate(2026, 10, 15, 14, 15);

      const sla = calculateBusinessSla(assigned, evalTime);

      expect(sla.activeFrom.getTime()).toBe(assigned.getTime());
      expect(formatLocalTime12h(sla.expiresAt)).toBe("3:00 PM");
      expect(sla.isExpired).toBe(false);
      expect(sla.phase).toBe("ACTIVE");
      expect(sla.remainingMinutes).toBe(45);
      expect(sla.badgeText).toBe("45m left");
    });

    test("Request at 2:00 PM expires at 3:00 PM", () => {
      const assigned = makeIstDate(2026, 10, 15, 14, 0);
      const evalTimeExpired = makeIstDate(2026, 10, 15, 15, 1);

      const sla = calculateBusinessSla(assigned, evalTimeExpired);

      expect(sla.isExpired).toBe(true);
      expect(sla.phase).toBe("EXPIRED");
      expect(sla.remainingMinutes).toBe(0);
      expect(sla.badgeText).toBe("Timed Out");
    });
  });

  describe("Night / Off-Hours bookings (After 9:00 PM)", () => {
    test("Request at 10:00 PM starts 9:00 AM next day and expires at 10:00 AM next day", () => {
      const assigned = makeIstDate(2026, 10, 15, 22, 0); // 10:00 PM
      const evalNight = makeIstDate(2026, 10, 15, 23, 30); // 11:30 PM (same night)

      const sla = calculateBusinessSla(assigned, evalNight);

      // Active from 9:00 AM tomorrow
      expect(formatLocalTime12h(sla.activeFrom)).toBe("9:00 AM");
      // Expires at 10:00 AM tomorrow
      expect(formatLocalTime12h(sla.expiresAt)).toBe("10:00 AM");

      // While in the night window:
      expect(sla.isExpired).toBe(false);
      expect(sla.phase).toBe("QUEUED_NIGHT");
      expect(sla.remainingMinutes).toBe(60);
      expect(sla.badgeText).toBe("Starts 9:00 AM");
      expect(sla.hintText).toContain("Business hours: 9 AM - 9 PM");
    });

    test("Request at 10:00 PM transitions to ACTIVE at 9:15 AM next morning", () => {
      const assigned = makeIstDate(2026, 10, 15, 22, 0); // 10:00 PM Oct 15
      const evalMorning = makeIstDate(2026, 10, 16, 9, 15); // 9:15 AM Oct 16

      const sla = calculateBusinessSla(assigned, evalMorning);

      expect(sla.isExpired).toBe(false);
      expect(sla.phase).toBe("ACTIVE");
      expect(sla.remainingMinutes).toBe(45);
      expect(sla.badgeText).toBe("45m left");
    });

    test("Request at 10:00 PM expires at 10:00 AM next morning", () => {
      const assigned = makeIstDate(2026, 10, 15, 22, 0); // 10:00 PM Oct 15
      const evalExpired = makeIstDate(2026, 10, 16, 10, 1); // 10:01 AM Oct 16

      const sla = calculateBusinessSla(assigned, evalExpired);

      expect(sla.isExpired).toBe(true);
      expect(sla.phase).toBe("EXPIRED");
      expect(sla.remainingMinutes).toBe(0);
      expect(sla.badgeText).toBe("Timed Out");
    });
  });

  describe("Early Morning bookings (Before 9:00 AM)", () => {
    test("Request at 6:30 AM starts at 9:00 AM today and expires at 10:00 AM today", () => {
      const assigned = makeIstDate(2026, 10, 15, 6, 30); // 6:30 AM
      const evalTime = makeIstDate(2026, 10, 15, 7, 0); // 7:00 AM

      const sla = calculateBusinessSla(assigned, evalTime);

      expect(formatLocalTime12h(sla.activeFrom)).toBe("9:00 AM");
      expect(formatLocalTime12h(sla.expiresAt)).toBe("10:00 AM");
      expect(sla.isExpired).toBe(false);
      expect(sla.phase).toBe("QUEUED_NIGHT");
      expect(sla.remainingMinutes).toBe(60);
      expect(sla.badgeText).toBe("Starts 9:00 AM");
    });
  });

  describe("Late Evening Rollover (Between 8:00 PM and 9:00 PM)", () => {
    test("Request at 8:30 PM gets 30m today and rolls 30m to 9:30 AM tomorrow", () => {
      const assigned = makeIstDate(2026, 10, 15, 20, 30); // 8:30 PM Oct 15
      const evalDuringEvening = makeIstDate(2026, 10, 15, 20, 45); // 8:45 PM Oct 15

      const sla1 = calculateBusinessSla(assigned, evalDuringEvening);
      expect(formatLocalTime12h(sla1.expiresAt)).toBe("9:30 AM");
      expect(sla1.isExpired).toBe(false);
      expect(sla1.phase).toBe("ACTIVE");
      // 15 mins left today + 30 mins tomorrow = 45m left
      expect(sla1.remainingMinutes).toBe(45);

      // Now evaluate during night pause (e.g. 11:00 PM Oct 15)
      const evalNightPause = makeIstDate(2026, 10, 15, 23, 0);
      const sla2 = calculateBusinessSla(assigned, evalNightPause);
      expect(sla2.isExpired).toBe(false);
      expect(sla2.phase).toBe("PAUSED_OVERNIGHT");
      expect(sla2.remainingMinutes).toBe(30);
      expect(sla2.badgeText).toBe("Paused (Night)");

      // Now evaluate next morning at 9:10 AM Oct 16
      const evalMorning = makeIstDate(2026, 10, 16, 9, 10);
      const sla3 = calculateBusinessSla(assigned, evalMorning);
      expect(sla3.isExpired).toBe(false);
      expect(sla3.phase).toBe("ACTIVE");
      expect(sla3.remainingMinutes).toBe(20);
      expect(sla3.badgeText).toBe("20m left");

      // Now evaluate next morning at 9:31 AM Oct 16 (expired)
      const evalExpired = makeIstDate(2026, 10, 16, 9, 31);
      const sla4 = calculateBusinessSla(assigned, evalExpired);
      expect(sla4.isExpired).toBe(true);
      expect(sla4.phase).toBe("EXPIRED");
    });

    test("Request at 8:59 PM gets 1m today and rolls 59m to 9:59 AM tomorrow", () => {
      const assigned = makeIstDate(2026, 10, 15, 20, 59); // 8:59 PM
      const sla = calculateBusinessSla(assigned, assigned);
      expect(formatLocalTime12h(sla.expiresAt)).toBe("9:59 AM");
    });
  });

  describe("hasFirmTimedOut helper", () => {
    test("returns false when inside night window even if hours elapsed is > 1", () => {
      const assigned = makeIstDate(2026, 10, 15, 22, 0); // 10:00 PM
      const nextMorning8Am = makeIstDate(2026, 10, 16, 8, 0); // 10 hours later!

      // 10 wall-clock hours passed, but SLA has not even started yet!
      expect(hasFirmTimedOut(assigned, nextMorning8Am)).toBe(false);
    });

    test("returns true only once 10:00 AM arrives next morning", () => {
      const assigned = makeIstDate(2026, 10, 15, 22, 0); // 10:00 PM
      const nextMorning1005Am = makeIstDate(2026, 10, 16, 10, 5); // 10:05 AM

      expect(hasFirmTimedOut(assigned, nextMorning1005Am)).toBe(true);
    });
  });
});
