export interface Package {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  emoji: string;
}

export interface Booking {
  id: number;
  packageId: number;
  packageName: string | null;
  emoji: string | null;
  customerName: string;
  customerEmail: string;
  sessionDate: string;
  notes: string;
  status: string;
  createdAt: string;
}

export interface NewBooking {
  packageId: number;
  customerName: string;
  customerEmail: string;
  sessionDate: string;
  notes: string;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.details?.join(", ") || body.error || res.statusText;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function fetchPackages(): Promise<Package[]> {
  return handle<Package[]>(await fetch("/api/packages"));
}

export async function fetchBookings(): Promise<Booking[]> {
  return handle<Booking[]>(await fetch("/api/bookings"));
}

export async function createBooking(payload: NewBooking): Promise<Booking> {
  return handle<Booking>(
    await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function deleteBooking(id: number): Promise<void> {
  const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    throw new Error("Failed to cancel booking");
  }
}
