import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createDb } from "../src/lib/db.js";

const db = createDb("specials.db");

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rows = db
    .prepare("SELECT id, name, slug FROM retailers ORDER BY name")
    .all() as Array<{ id: number; name: string; slug: string }>;

  res.status(200).json({ retailers: rows });
}
