import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Isolate the test database before importing modules that open it.
const tmp = mkdtempSync(join(tmpdir(), 'bas-test-'));
process.env.BAS_DATA_DIR = tmp;
process.env.BAS_DB_PATH = join(tmp, 'test.db');

const { createApp } = await import('../src/app.js');
const { seed } = await import('../src/seed.js');

let server;
let baseUrl;

before(async () => {
  seed({ days: 2 });
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(() => {
  server?.close();
  rmSync(tmp, { recursive: true, force: true });
});

test('health endpoint reports ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
});

test('slots are seeded and available', async () => {
  const res = await fetch(`${baseUrl}/api/slots`);
  assert.equal(res.status, 200);
  const { slots } = await res.json();
  assert.ok(slots.length > 0, 'expected at least one available slot');
});

test('booking a slot removes it from availability and appears in bookings', async () => {
  const before = await (await fetch(`${baseUrl}/api/slots`)).json();
  const slot = before.slots[0];

  const createRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slot_id: slot.id,
      customer_name: 'Test Customer',
      email: 'test@example.com',
      shoot_type: 'Portrait',
      notes: 'Please bring the softbox.',
    }),
  });
  assert.equal(createRes.status, 201);
  const { booking } = await createRes.json();
  assert.equal(booking.photographer, slot.photographer);

  const after = await (await fetch(`${baseUrl}/api/slots`)).json();
  assert.ok(
    !after.slots.some((s) => s.id === slot.id),
    'booked slot should no longer be available'
  );

  const bookings = await (await fetch(`${baseUrl}/api/bookings`)).json();
  assert.ok(bookings.bookings.some((b) => b.id === booking.id));
});

test('double-booking a slot is rejected with 409', async () => {
  const { slots } = await (await fetch(`${baseUrl}/api/slots`)).json();
  const slot = slots[0];
  const payload = {
    slot_id: slot.id,
    customer_name: 'First',
    email: 'first@example.com',
    shoot_type: 'Wedding',
  };
  const first = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(first.status, 201);

  const second = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, customer_name: 'Second' }),
  });
  assert.equal(second.status, 409);
});

test('invalid payloads are rejected with 400', async () => {
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_name: 'No Slot' }),
  });
  assert.equal(res.status, 400);
});
