import {
  normalizeHtmlDateValue,
  normalizeHtmlTimeValue,
  usesHtmlDateTimeInputs,
} from "@/src/utils/dateTime";

describe("web date and time inputs", () => {
  test("web uses HTML date/time inputs because Expo datetimepicker is native-only", () => {
    expect(usesHtmlDateTimeInputs("web")).toBe(true);
    expect(usesHtmlDateTimeInputs("ios")).toBe(false);
    expect(usesHtmlDateTimeInputs("android")).toBe(false);
  });

  test("HTML date values stay YYYY-MM-DD and reject empty or malformed strings", () => {
    expect(normalizeHtmlDateValue("2099-10-12")).toBe("2099-10-12");
    expect(normalizeHtmlDateValue("")).toBeNull();
    expect(normalizeHtmlDateValue("12/10/2099")).toBeNull();
  });

  test("HTML time values normalize to HH:mm including overnight 20:00 and 02:00", () => {
    expect(normalizeHtmlTimeValue("20:00")).toBe("20:00");
    expect(normalizeHtmlTimeValue("02:00")).toBe("02:00");
    expect(normalizeHtmlTimeValue("2:00")).toBe("02:00");
    expect(normalizeHtmlTimeValue("20:00:00")).toBe("20:00");
    expect(normalizeHtmlTimeValue("")).toBeNull();
    expect(normalizeHtmlTimeValue("25:00")).toBeNull();
  });
});
