import cors from "cors";
import express, { type Request, type Response } from "express";
import { db, initSchema, type BookingRow, type PackageRow } from "./db.js";
import { seedPackages } from "./seed.js";

const PORT = Number(process.env.PORT ?? 3001);

initSchema();
// Ensure the catalog exists on first boot so the app is usable immediately.
const packageCount = db.prepare("SELECT COUNT(*) AS n FROM packages").get() as {
  n: number;
};
if (packageCount.n === 0) {
  const seeded = seedPackages();
  console.log(`Seeded ${seeded} photography packages on first boot.`);
}

const app = express();
app.use(cors());
app.use(express.json());

function serializePackage(row: PackageRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price_cents / 100,
    durationMinutes: row.duration_min,
    emoji: row.emoji,
  };
}

function serializeBooking(row: BookingRow & { package_name?: string; emoji?: string }) {
  return {
    id: row.id,
    packageId: row.package_id,
    packageName: row.package_name ?? null,
    emoji: row.emoji ?? null,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    sessionDate: row.session_date,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/packages", (_req: Request, res: Response) => {
  const rows = db
    .prepare("SELECT * FROM packages ORDER BY price_cents ASC")
    .all() as PackageRow[];
  res.json(rows.map(serializePackage));
});

app.get("/api/bookings", (_req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT b.*, p.name AS package_name, p.emoji AS emoji
       FROM bookings b
       JOIN packages p ON p.id = b.package_id
       ORDER BY b.created_at DESC, b.id DESC`,
    )
    .all() as (BookingRow & { package_name: string; emoji: string })[];
  res.json(rows.map(serializeBooking));
});

app.post("/api/bookings", (req: Request, res: Response) => {
  const { packageId, customerName, customerEmail, sessionDate, notes } =
    req.body ?? {};

  const errors: string[] = [];
  if (!Number.isInteger(packageId)) errors.push("packageId must be an integer");
  if (typeof customerName !== "string" || customerName.trim().length < 2)
    errors.push("customerName is required");
  if (
    typeof customerEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
  )
    errors.push("a valid customerEmail is required");
  if (typeof sessionDate !== "string" || Number.isNaN(Date.parse(sessionDate)))
    errors.push("sessionDate must be a valid date");

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const pkg = db
    .prepare("SELECT * FROM packages WHERE id = ?")
    .get(packageId) as PackageRow | undefined;
  if (!pkg) {
    return res.status(404).json({ error: "Package not found" });
  }

  const info = db
    .prepare(
      `INSERT INTO bookings (package_id, customer_name, customer_email, session_date, notes)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      packageId,
      customerName.trim(),
      customerEmail.trim(),
      sessionDate,
      typeof notes === "string" ? notes.trim() : "",
    );

  const created = db
    .prepare(
      `SELECT b.*, p.name AS package_name, p.emoji AS emoji
       FROM bookings b JOIN packages p ON p.id = b.package_id
       WHERE b.id = ?`,
    )
    .get(info.lastInsertRowid) as BookingRow & {
    package_name: string;
    emoji: string;
  };

  res.status(201).json(serializeBooking(created));
});

app.delete("/api/bookings/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid booking id" });
  }
  const info = db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Booking not found" });
  }
  res.status(204).end();
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Book-A-Shoot API listening on http://0.0.0.0:${PORT}`);
});
