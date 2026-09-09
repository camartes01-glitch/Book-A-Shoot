/** Indian digit grouping, e.g. 1,50,000. */
export function formatInr(amount: number): string {
  const rounded = Math.round(amount);
  const isNegative = rounded < 0;
  const digits = Math.abs(rounded).toString();
  let result: string;
  if (digits.length <= 3) {
    result = digits;
  } else {
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3);
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    result = `${grouped},${last3}`;
  }
  return `${isNegative ? "-" : ""}\u20B9${result}`;
}

export function formatInrRange(min: number, max: number): string {
  if (min === max) return formatInr(min);
  return `${formatInr(min)}–${formatInr(max)}`;
}

/** Package name plus the overall calculated range, e.g. Essential — ₹3,000–₹4,000. */
export function formatPackageOverallLabel(label: string, minPrice: number, maxPrice: number): string {
  if (maxPrice <= 0) return label;
  return `${label} — ${formatInrRange(minPrice, maxPrice)}`;
}

export function formatDateLong(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime12h(hhmm: string | null): string {
  if (!hhmm) return "—";
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}
