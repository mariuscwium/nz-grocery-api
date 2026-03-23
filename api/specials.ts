import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createDb } from "../src/lib/db.js";
import { validateSpecialsBody } from "../src/api/validate.js";
import { handleSpecials } from "../src/api/handler.js";

const db = createDb("specials.db");

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const validation = validateSpecialsBody(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const result = handleSpecials(db, validation.body);
  res.status(200).json(result);
}
