import { createDb, querySpecials } from "../src/lib/db.js";

const db = createDb("specials.db");

const total = db.prepare("SELECT COUNT(*) as c FROM specials").get() as { c: number };
const byCat = db.prepare("SELECT category_id, COUNT(*) as c FROM specials GROUP BY category_id").all() as Array<{ category_id: number; c: number }>;
const retailers = db.prepare("SELECT DISTINCT retailer_id FROM specials").all() as Array<{ retailer_id: number }>;

process.stdout.write(`Total specials: ${String(total.c)}\n`);
process.stdout.write(`Retailers: ${String(retailers.length)}\n`);
process.stdout.write(`\nBy category:\n`);
for (const row of byCat) {
  process.stdout.write(`  ${String(row.category_id)}: ${String(row.c)} items\n`);
}

process.stdout.write(`\nCheapest 5:\n`);
const cheap = querySpecials(db, { limit: 5 });
for (const r of cheap) {
  const price = r.sale_price_cents !== null ? `$${(r.sale_price_cents / 100).toFixed(2)}` : "multi-buy";
  process.stdout.write(`  ${price} - ${r.product_name}\n`);
}

const q = process.argv[2];
if (q) {
  process.stdout.write(`\nSearch "${q}":\n`);
  const results = querySpecials(db, { q, limit: 10 });
  for (const r of results) {
    const price = r.sale_price_cents !== null ? `$${(r.sale_price_cents / 100).toFixed(2)}` : "multi-buy";
    process.stdout.write(`  ${price} - ${r.product_name}\n`);
  }
}

db.close();
