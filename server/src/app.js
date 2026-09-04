import express from 'express';
import cors from 'cors';
import { db, initSchema } from './db.js';

export function createApp() {
  initSchema();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'book-a-shoot', time: new Date().toISOString() });
  });

  // Available slots (not yet booked), optionally filtered by photographer.
  app.get('/api/slots', (req, res) => {
    const { photographer } = req.query;
    const params = [];
    let where = 'WHERE b.id IS NULL';
    if (photographer) {
      where += ' AND s.photographer = ?';
      params.push(photographer);
    }
    const rows = db
      .prepare(
        `SELECT s.id, s.photographer, s.starts_at, s.duration_min, s.location
         FROM slots s
         LEFT JOIN bookings b ON b.slot_id = s.id
         ${where}
         ORDER BY s.starts_at ASC, s.photographer ASC`
      )
      .all(...params);
    res.json({ slots: rows });
  });

  // All bookings joined with their slot details.
  app.get('/api/bookings', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT b.id, b.customer_name, b.email, b.shoot_type, b.notes, b.created_at,
                s.photographer, s.starts_at, s.duration_min, s.location
         FROM bookings b
         JOIN slots s ON s.id = b.slot_id
         ORDER BY s.starts_at ASC`
      )
      .all();
    res.json({ bookings: rows });
  });

  // Create a booking for an available slot.
  app.post('/api/bookings', (req, res) => {
    const { slot_id, customer_name, email, shoot_type, notes } = req.body ?? {};

    if (!slot_id || !customer_name || !email || !shoot_type) {
      return res.status(400).json({
        error: 'slot_id, customer_name, email and shoot_type are required.',
      });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const slot = db.prepare('SELECT id FROM slots WHERE id = ?').get(slot_id);
    if (!slot) {
      return res.status(404).json({ error: `Slot ${slot_id} does not exist.` });
    }

    const taken = db.prepare('SELECT id FROM bookings WHERE slot_id = ?').get(slot_id);
    if (taken) {
      return res.status(409).json({ error: 'That slot has already been booked.' });
    }

    const info = db
      .prepare(
        `INSERT INTO bookings (slot_id, customer_name, email, shoot_type, notes)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(slot_id, customer_name, email, shoot_type, notes ?? null);

    const created = db
      .prepare(
        `SELECT b.id, b.customer_name, b.email, b.shoot_type, b.notes, b.created_at,
                s.photographer, s.starts_at, s.duration_min, s.location
         FROM bookings b
         JOIN slots s ON s.id = b.slot_id
         WHERE b.id = ?`
      )
      .get(info.lastInsertRowid);

    res.status(201).json({ booking: created });
  });

  // Cancel a booking, freeing its slot.
  app.delete('/api/bookings/:id', (req, res) => {
    const info = db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    res.status(204).end();
  });

  return app;
}

export default createApp;
