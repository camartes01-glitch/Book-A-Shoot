let counter = 0;

/** Lightweight id generator (no native crypto dependency needed). Good enough
 * for client-side draft ids; the backend issues the authoritative booking id. */
export function makeId(prefix: string): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}-${counter}`;
}

export function makeBookingId(year: number, sequence: number): string {
  return `CAM-${year}-${String(sequence).padStart(6, "0")}`;
}
