import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const SHOOT_TYPES = ['Portrait', 'Wedding', 'Family', 'Product', 'Event', 'Headshot'];

function formatSlot(iso) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function App() {
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({
    customer_name: '',
    email: '',
    shoot_type: SHOOT_TYPES[0],
    notes: '',
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [{ slots }, { bookings }] = await Promise.all([
      api.getSlots(),
      api.getBookings(),
    ]);
    setSlots(slots);
    setBookings(bookings);
    setLoading(false);
  }

  useEffect(() => {
    refresh().catch((err) => {
      setStatus({ kind: 'error', message: err.message });
      setLoading(false);
    });
  }, []);

  const slotsByPhotographer = useMemo(() => {
    const groups = new Map();
    for (const slot of slots) {
      if (!groups.has(slot.photographer)) groups.set(slot.photographer, []);
      groups.get(slot.photographer).push(slot);
    }
    return [...groups.entries()];
  }, [slots]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedSlot) {
      setStatus({ kind: 'error', message: 'Please pick an available slot first.' });
      return;
    }
    try {
      const { booking } = await api.createBooking({
        slot_id: selectedSlot.id,
        ...form,
      });
      setStatus({
        kind: 'success',
        message: `Booked ${booking.shoot_type} with ${booking.photographer} on ${formatSlot(
          booking.starts_at
        )}.`,
      });
      setSelectedSlot(null);
      setForm({ customer_name: '', email: '', shoot_type: SHOOT_TYPES[0], notes: '' });
      await refresh();
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  async function handleCancel(id) {
    try {
      await api.cancelBooking(id);
      setStatus({ kind: 'success', message: 'Booking cancelled.' });
      await refresh();
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Book-A-Shoot</h1>
        <p>Reserve a session with one of our photographers.</p>
      </header>

      {status && <div className={`banner ${status.kind}`}>{status.message}</div>}

      <main className="layout">
        <section className="panel">
          <h2>Available slots</h2>
          {loading ? (
            <p className="muted">Loading availability…</p>
          ) : slotsByPhotographer.length === 0 ? (
            <p className="muted">No open slots right now — check back soon.</p>
          ) : (
            slotsByPhotographer.map(([photographer, group]) => (
              <div key={photographer} className="photographer">
                <h3>
                  {photographer}
                  <span className="location">{group[0].location}</span>
                </h3>
                <div className="slot-grid">
                  {group.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      className={`slot ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {formatSlot(slot.starts_at)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="panel">
          <h2>Book your session</h2>
          <form onSubmit={handleSubmit} className="booking-form">
            <label>
              Selected slot
              <input
                readOnly
                value={
                  selectedSlot
                    ? `${selectedSlot.photographer} — ${formatSlot(selectedSlot.starts_at)}`
                    : 'Pick a slot from the left'
                }
              />
            </label>
            <label>
              Your name
              <input
                required
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder="Jamie Rivera"
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jamie@example.com"
              />
            </label>
            <label>
              Shoot type
              <select
                value={form.shoot_type}
                onChange={(e) => setForm({ ...form, shoot_type: e.target.value })}
              >
                {SHOOT_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              Notes
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Anything we should know?"
              />
            </label>
            <button type="submit" className="primary" disabled={!selectedSlot}>
              Confirm booking
            </button>
          </form>
        </section>
      </main>

      <section className="panel bookings">
        <h2>Upcoming bookings ({bookings.length})</h2>
        {bookings.length === 0 ? (
          <p className="muted">No bookings yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Photographer</th>
                <th>Customer</th>
                <th>Type</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{formatSlot(b.starts_at)}</td>
                  <td>{b.photographer}</td>
                  <td>
                    {b.customer_name}
                    <span className="muted email">{b.email}</span>
                  </td>
                  <td>{b.shoot_type}</td>
                  <td>
                    <button
                      type="button"
                      className="link danger"
                      onClick={() => handleCancel(b.id)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
