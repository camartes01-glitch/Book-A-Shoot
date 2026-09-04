const jsonHeaders = { 'Content-Type': 'application/json' };

async function handle(res) {
  if (!res.ok && res.status !== 204) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  getSlots: () => fetch('/api/slots').then(handle),
  getBookings: () => fetch('/api/bookings').then(handle),
  createBooking: (payload) =>
    fetch('/api/bookings', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }).then(handle),
  cancelBooking: (id) =>
    fetch(`/api/bookings/${id}`, { method: 'DELETE' }).then(handle),
};
