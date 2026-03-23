import type Database from "better-sqlite3";

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

function buildConditions(params: QueryParams): { conditions: string[]; values: Record<string, unknown>; useFts: boolean } {
  const conditions: string[] = ["sale_price_cents IS NOT NULL"];
  const values: Record<string, unknown> = {};
  let useFts = false;

  if (params.q) {
    useFts = true;
    values["q"] = `"${params.q}"*`;
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

  return { conditions, values, useFts };
}

export function querySpecials(db: Database.Database, params: QueryParams): SpecialRow[] {
  const { conditions, values, useFts } = buildConditions(params);
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  values["limit"] = limit;
  values["offset"] = offset;

  if (useFts) {
    const ftsConditions = conditions.filter(c => !c.includes("specials_fts"));
    const allConditions = ftsConditions.length > 0 ? `AND ${ftsConditions.join(" AND ")}` : "";
    const sql = `SELECT specials.* FROM specials_fts
      JOIN specials ON specials.id = specials_fts.rowid
      WHERE specials_fts MATCH @q ${allConditions}
      ORDER BY specials_fts.rank, specials.sale_price_cents ASC
      LIMIT @limit OFFSET @offset`;
    return db.prepare(sql).all(values) as SpecialRow[];
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const sql = `SELECT * FROM specials ${where} ORDER BY sale_price_cents ASC LIMIT @limit OFFSET @offset`;
  return db.prepare(sql).all(values) as SpecialRow[];
}
