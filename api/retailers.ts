import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createDb } from "../src/lib/db.js";

const db = createDb("specials.db");

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rows = db
    .prepare("SELECT DISTINCT retailer_id as id FROM specials ORDER BY id")
    .all() as Array<{ id: number }>;

  res.status(200).json({ retailers: rows });
}
