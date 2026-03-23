import Database from "better-sqlite3";
import type { Special } from "./types.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS retailers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS specials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  salefinder_item_id TEXT NOT NULL,
  salefinder_sale_id TEXT,
  retailer_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  sale_price_cents INTEGER,
  original_price_cents INTEGER,
  savings_cents INTEGER,
  multi_buy_qty INTEGER,
  multi_buy_price_cents INTEGER,
  unit_price_text TEXT,
  member_price INTEGER DEFAULT 0,
  buy_url TEXT,
  region TEXT NOT NULL DEFAULT 'Canterbury',
  scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(salefinder_item_id, salefinder_sale_id, region)
);

CREATE INDEX IF NOT EXISTS idx_specials_category ON specials(category_id);
CREATE INDEX IF NOT EXISTS idx_specials_retailer ON specials(retailer_id);
CREATE INDEX IF NOT EXISTS idx_specials_region ON specials(region);

CREATE VIRTUAL TABLE IF NOT EXISTS specials_fts USING fts5(product_name, content=specials, content_rowid=id);

CREATE TRIGGER IF NOT EXISTS specials_ai AFTER INSERT ON specials BEGIN
  INSERT INTO specials_fts(rowid, product_name) VALUES (new.id, new.product_name);
END;
CREATE TRIGGER IF NOT EXISTS specials_ad AFTER DELETE ON specials BEGIN
  INSERT INTO specials_fts(specials_fts, rowid, product_name) VALUES('delete', old.id, old.product_name);
END;
CREATE TRIGGER IF NOT EXISTS specials_au AFTER UPDATE ON specials BEGIN
  INSERT INTO specials_fts(specials_fts, rowid, product_name) VALUES('delete', old.id, old.product_name);
  INSERT INTO specials_fts(rowid, product_name) VALUES (new.id, new.product_name);
END;
`;

export function createDb(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  return db;
}

export function rebuildFts(db: Database.Database): void {
  db.exec("INSERT INTO specials_fts(specials_fts) VALUES('rebuild')");
}

export function upsertSpecials(db: Database.Database, specials: Special[]): number {
  const stmt = db.prepare(`
    INSERT INTO specials (
      salefinder_item_id, salefinder_sale_id, retailer_id, category_id,
      product_name, description, sale_price_cents, original_price_cents,
      savings_cents, multi_buy_qty, multi_buy_price_cents, unit_price_text,
      member_price, buy_url, region
    ) VALUES (
      @salefinderId, @saleId, @retailerId, @categoryId,
      @productName, @description, @salePriceCents, @originalPriceCents,
      @savingsCents, @multiBuyQty, @multiBuyPriceCents, @unitPriceText,
      @memberPrice, @buyUrl, @region
    ) ON CONFLICT(salefinder_item_id, salefinder_sale_id, region) DO UPDATE SET
      product_name = excluded.product_name,
      sale_price_cents = excluded.sale_price_cents,
      original_price_cents = excluded.original_price_cents,
      savings_cents = excluded.savings_cents,
      multi_buy_qty = excluded.multi_buy_qty,
      multi_buy_price_cents = excluded.multi_buy_price_cents,
      unit_price_text = excluded.unit_price_text,
      member_price = excluded.member_price,
      buy_url = excluded.buy_url,
      scraped_at = datetime('now')
  `);

  const upsertMany = db.transaction((items: Special[]) => {
    let count = 0;
    for (const item of items) {
      stmt.run({
        ...item,
        memberPrice: item.memberPrice ? 1 : 0,
      });
      count++;
    }
    return count;
  });

  return upsertMany(specials);
}

export interface Retailer {
  id: number;
  name: string;
  slug: string;
}

export function upsertRetailers(db: Database.Database, retailers: Retailer[]): void {
  const stmt = db.prepare(`
    INSERT INTO retailers (id, name, slug)
    VALUES (@id, @name, @slug)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, slug = excluded.slug
  `);

  const upsertMany = db.transaction((items: Retailer[]) => {
    for (const item of items) {
      stmt.run(item);
    }
  });

  upsertMany(retailers);
}

export { querySpecials } from "./query.js";
export type { SpecialRow } from "./query.js";
