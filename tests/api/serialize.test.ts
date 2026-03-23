import { describe, it, expect } from "vitest";
import { serializeSpecial } from "../../src/api/serialize.js";
import type { SpecialRow } from "../../src/lib/db.js";

describe("serializeSpecial", () => {
  it("maps snake_case DB row to camelCase response", () => {
    const row: SpecialRow = {
      id: 42,
      product_name: "Anchor Milk 2L",
      description: "Fresh",
      sale_price_cents: 399,
      original_price_cents: 549,
      savings_cents: 150,
      multi_buy_qty: null,
      multi_buy_price_cents: null,
      unit_price_text: "$2.00/L",
      member_price: 0,
      buy_url: "https://example.com",
      retailer_id: 1,
      category_id: 191,
      region: "Canterbury",
      scraped_at: "2025-03-24 00:00:00",
    };

    const result = serializeSpecial(row);

    expect(result).toEqual({
      id: 42,
      productName: "Anchor Milk 2L",
      description: "Fresh",
      salePriceCents: 399,
      originalPriceCents: 549,
      savingsCents: 150,
      multiBuyQty: null,
      multiBuyPriceCents: null,
      unitPriceText: "$2.00/L",
      memberPrice: false,
      buyUrl: "https://example.com",
      retailerId: 1,
      categoryId: 191,
      region: "Canterbury",
      scrapedAt: "2025-03-24 00:00:00Z",
    });
  });

  it("maps member_price 1 to true", () => {
    const row: SpecialRow = {
      id: 1, product_name: "X", description: null,
      sale_price_cents: 100, original_price_cents: null,
      savings_cents: null, multi_buy_qty: null,
      multi_buy_price_cents: null, unit_price_text: null,
      member_price: 1, buy_url: null, retailer_id: 1,
      category_id: 191, region: "Canterbury",
      scraped_at: "2025-03-24 00:00:00",
    };

    expect(serializeSpecial(row).memberPrice).toBe(true);
  });
});
