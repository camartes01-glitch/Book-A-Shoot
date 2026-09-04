import { createApp } from './app.js';
import { seed } from './seed.js';

const PORT = Number(process.env.PORT) || 4000;

// Ensure schema + demo slots exist so a fresh checkout has something to show.
const result = seed();
if (!result.skipped) {
  console.log(`Seeded ${result.inserted} photography slots.`);
}

const app = createApp();
app.listen(PORT, () => {
  console.log(`Book-A-Shoot API listening on http://localhost:${PORT}`);
});
