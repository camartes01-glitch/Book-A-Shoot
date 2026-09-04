import { useEffect, useMemo, useState } from "react";
import {
  createBooking,
  deleteBooking,
  fetchBookings,
  fetchPackages,
  type Booking,
  type Package,
} from "./api";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function App() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(todayPlus(7));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedId) ?? null,
    [packages, selectedId],
  );

  async function refresh() {
    const [pkgs, bks] = await Promise.all([fetchPackages(), fetchBookings()]);
    setPackages(pkgs);
    setBookings(bks);
    if (pkgs.length > 0 && selectedId === null) setSelectedId(pkgs[0].id);
  }

  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFlash(null);
    if (selectedId === null) {
      setError("Please choose a package.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createBooking({
        packageId: selectedId,
        customerName: name,
        customerEmail: email,
        sessionDate: date,
        notes,
      });
      setBookings((prev) => [created, ...prev]);
      setFlash(`Booked ${created.packageName} for ${created.customerName}! 🎉`);
      setName("");
      setEmail("");
      setNotes("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: number) {
    setError(null);
    const previous = bookings;
    setBookings((prev) => prev.filter((b) => b.id !== id));
    try {
      await deleteBooking(id);
      setFlash("Booking cancelled.");
    } catch (e) {
      setBookings(previous);
      setError((e as Error).message);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__inner">
          <span className="badge">📸 Book-A-Shoot</span>
          <h1>Capture the moment. Book your shoot in seconds.</h1>
          <p>
            Professional photography sessions for portraits, weddings, events,
            and brands — reserved instantly, confirmed on the spot.
          </p>
        </div>
      </header>

      <main className="container">
        {flash && <div className="flash flash--ok">{flash}</div>}
        {error && <div className="flash flash--err">{error}</div>}

        <section aria-labelledby="packages-title">
          <h2 id="packages-title">Choose a package</h2>
          {loading ? (
            <p className="muted">Loading packages…</p>
          ) : (
            <div className="grid">
              {packages.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={
                    "card" + (p.id === selectedId ? " card--selected" : "")
                  }
                  onClick={() => setSelectedId(p.id)}
                  aria-pressed={p.id === selectedId}
                >
                  <span className="card__emoji" aria-hidden>
                    {p.emoji}
                  </span>
                  <span className="card__name">{p.name}</span>
                  <span className="card__desc">{p.description}</span>
                  <span className="card__meta">
                    <strong>{currency.format(p.price)}</strong>
                    <span className="muted">· {p.durationMinutes} min</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="booking" aria-labelledby="book-title">
          <h2 id="book-title">
            Reserve your session
            {selectedPackage ? ` · ${selectedPackage.name}` : ""}
          </h2>
          <form className="form" onSubmit={handleSubmit}>
            <div className="form__row">
              <label>
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ada@example.com"
                  required
                />
              </label>
            </div>
            <div className="form__row">
              <label>
                Session date
                <input
                  type="date"
                  value={date}
                  min={todayPlus(0)}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <label>
                Notes (optional)
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Golden hour by the pier"
                />
              </label>
            </div>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Booking…" : "Confirm booking"}
            </button>
          </form>
        </section>

        <section aria-labelledby="bookings-title">
          <h2 id="bookings-title">
            Upcoming bookings <span className="pill">{bookings.length}</span>
          </h2>
          {bookings.length === 0 ? (
            <p className="muted">
              No bookings yet — reserve your first shoot above.
            </p>
          ) : (
            <ul className="bookings">
              {bookings.map((b) => (
                <li key={b.id} className="booking-item">
                  <span className="booking-item__emoji" aria-hidden>
                    {b.emoji ?? "📷"}
                  </span>
                  <div className="booking-item__body">
                    <strong>{b.packageName}</strong>
                    <span className="muted">
                      {b.customerName} · {b.customerEmail}
                    </span>
                    <span className="muted">
                      {formatDate(b.sessionDate)}
                      {b.notes ? ` — ${b.notes}` : ""}
                    </span>
                  </div>
                  <span className={`status status--${b.status}`}>
                    {b.status}
                  </span>
                  <button
                    className="btn btn--ghost"
                    onClick={() => handleCancel(b.id)}
                    aria-label={`Cancel booking ${b.id}`}
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>Book-A-Shoot · built for the Cloud Agent dev environment demo</span>
      </footer>
    </div>
  );
}
