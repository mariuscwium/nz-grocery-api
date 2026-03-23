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

CREATE INDEX IF NOT EXISTS idx_specials_product ON specials(product_name);
CREATE INDEX IF NOT EXISTS idx_specials_category ON specials(category_id);
CREATE INDEX IF NOT EXISTS idx_specials_retailer ON specials(retailer_id);
CREATE INDEX IF NOT EXISTS idx_specials_region ON specials(region);
`;

export function createDb(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  return db;
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

export interface SpecialRow {
  id: number;
  product_name: string;
  description: string | null;
  sale_price_cents: number | null;
  original_price_cents: number | null;
  savings_cents: number | null;
  multi_buy_qty: number | null;
  multi_buy_price_cents: number | null;
  unit_price_text: string | null;
  member_price: number;
  buy_url: string | null;
  category_id: number;
  retailer_id: number;
  region: string;
  scraped_at: string;
}

interface QueryParams {
  q?: string;
  categoryId?: number;
  retailerIds?: number[];
  maxPriceCents?: number;
  memberRetailerIds?: number[];
  region?: string;
  limit?: number;
  offset?: number;
}

interface ClauseTarget {
  conditions: string[];
  values: Record<string, unknown>;
}

function addInClause(ids: number[], prefix: string, column: string, target: ClauseTarget): void {
  const placeholders = ids.map((_, i) => `@${prefix}${String(i)}`).join(", ");
  target.conditions.push(`${column} IN (${placeholders})`);
  for (let i = 0; i < ids.length; i++) {
    target.values[`${prefix}${String(i)}`] = ids[i];
  }
}

function buildConditions(params: QueryParams): { conditions: string[]; values: Record<string, unknown> } {
  const conditions: string[] = ["sale_price_cents IS NOT NULL"];
  const values: Record<string, unknown> = {};

  if (params.q) {
    conditions.push("product_name LIKE @q");
    values["q"] = `%${params.q}%`;
  }
  if (params.categoryId !== undefined) {
    conditions.push("category_id = @categoryId");
    values["categoryId"] = params.categoryId;
  }
  if (params.retailerIds !== undefined && params.retailerIds.length > 0) {
    addInClause(params.retailerIds, "rid", "retailer_id", { conditions, values });
  }
  if (params.maxPriceCents !== undefined) {
    conditions.push("sale_price_cents <= @maxPriceCents");
    values["maxPriceCents"] = params.maxPriceCents;
  }
  if (params.memberRetailerIds !== undefined && params.memberRetailerIds.length > 0) {
    const placeholders = params.memberRetailerIds.map((_, i) => `@mrid${String(i)}`).join(", ");
    conditions.push(`(member_price = 0 OR retailer_id IN (${placeholders}))`);
    for (let i = 0; i < params.memberRetailerIds.length; i++) {
      values[`mrid${String(i)}`] = params.memberRetailerIds[i];
    }
  } else {
    conditions.push("member_price = 0");
  }
  if (params.region) {
    conditions.push("region = @region");
    values["region"] = params.region;
  }

  return { conditions, values };
}

export function querySpecials(db: Database.Database, params: QueryParams): SpecialRow[] {
  const { conditions, values } = buildConditions(params);
  const where = `WHERE ${conditions.join(" AND ")}`;
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  values["limit"] = limit;
  values["offset"] = offset;

  const sql = `SELECT * FROM specials ${where} ORDER BY sale_price_cents ASC LIMIT @limit OFFSET @offset`;
  return db.prepare(sql).all(values) as SpecialRow[];
}
