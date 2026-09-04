import { db, initSchema } from './db.js';

const PHOTOGRAPHERS = [
  { name: 'Ava Rivera', location: 'Downtown Studio' },
  { name: 'Marcus Chen', location: 'Riverside Loft' },
  { name: 'Priya Nair', location: 'Golden Hour Rooftop' },
];

const SHOOT_HOURS = [9, 11, 13, 15, 17];

// Seed the next 7 days of one-hour slots for each photographer.
export function seed({ days = 7 } = {}) {
  initSchema();

  const existing = db.prepare('SELECT COUNT(*) AS n FROM slots').get().n;
  if (existing > 0) {
    return { inserted: 0, skipped: true };
  }

  const insert = db.prepare(
    `INSERT OR IGNORE INTO slots (photographer, starts_at, duration_min, location)
     VALUES (@photographer, @starts_at, @duration_min, @location)`
  );

  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);

  let inserted = 0;
  const insertMany = db.transaction(() => {
    for (let d = 1; d <= days; d += 1) {
      for (const { name, location } of PHOTOGRAPHERS) {
        for (const hour of SHOOT_HOURS) {
          const start = new Date(base);
          start.setUTCDate(base.getUTCDate() + d);
          start.setUTCHours(hour);
          const res = insert.run({
            photographer: name,
            starts_at: start.toISOString(),
            duration_min: 60,
            location,
          });
          inserted += res.changes;
        }
      }
    }
  });
  insertMany();

  return { inserted, skipped: false };
}

// Run directly: `node src/seed.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = seed();
  if (result.skipped) {
    console.log('Slots already present — skipping seed.');
  } else {
    console.log(`Seeded ${result.inserted} photography slots.`);
  }
}
