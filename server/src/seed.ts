import { db, initSchema } from "./db.js";
import { PACKAGE_SEEDS } from "./packages.js";

export function seedPackages(): number {
  initSchema();

  const upsert = db.prepare(`
    INSERT INTO packages (slug, name, description, price_cents, duration_min, emoji)
    VALUES (@slug, @name, @description, @price_cents, @duration_min, @emoji)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      price_cents = excluded.price_cents,
      duration_min = excluded.duration_min,
      emoji = excluded.emoji
  `);

  const tx = db.transaction((rows: typeof PACKAGE_SEEDS) => {
    for (const row of rows) upsert.run(row);
  });
  tx(PACKAGE_SEEDS);

  return PACKAGE_SEEDS.length;
}

// Allow running directly: `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  const count = seedPackages();
  console.log(`Seeded ${count} photography packages.`);
  process.exit(0);
}
