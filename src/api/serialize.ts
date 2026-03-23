import type { SpecialRow } from "../lib/db.js";

export interface SpecialResponse {
  id: number;
  productName: string;
  description: string | null;
  salePriceCents: number | null;
  originalPriceCents: number | null;
  savingsCents: number | null;
  multiBuyQty: number | null;
  multiBuyPriceCents: number | null;
  unitPriceText: string | null;
  memberPrice: boolean;
  buyUrl: string | null;
  retailerId: number;
  categoryId: number;
  region: string;
  scrapedAt: string;
}

export function serializeSpecial(row: SpecialRow): SpecialResponse {
  return {
    id: row.id,
    productName: row.product_name,
    description: row.description,
    salePriceCents: row.sale_price_cents,
    originalPriceCents: row.original_price_cents,
    savingsCents: row.savings_cents,
    multiBuyQty: row.multi_buy_qty,
    multiBuyPriceCents: row.multi_buy_price_cents,
    unitPriceText: row.unit_price_text,
    memberPrice: row.member_price === 1,
    buyUrl: row.buy_url,
    retailerId: row.retailer_id,
    categoryId: row.category_id,
    region: row.region,
    scrapedAt: row.scraped_at.endsWith("Z") ? row.scraped_at : `${row.scraped_at}Z`,
  };
}
