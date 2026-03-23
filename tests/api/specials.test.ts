import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync } from "fs";
import { createDb, upsertSpecials } from "../../src/lib/db.js";
import { handleSpecials } from "../../src/api/handler.js";
import type Database from "better-sqlite3";
import type { Special } from "../../src/lib/types.js";

const TEST_DB = "test-api-specials.db";

function makeSpecial(overrides: Partial<Special> = {}): Special {
  return {
    salefinderId: "item-1",
    saleId: "sale-1",
    retailerId: 1,
    productName: "Test Butter 500g",
    description: "Salted",
    salePriceCents: 650,
    originalPriceCents: 800,
    savingsCents: 150,
    multiBuyQty: null,
    multiBuyPriceCents: null,
    unitPriceText: "$6.50",
    memberPrice: false,
    buyUrl: "https://example.com/butter",
    categoryId: 191,
    region: "Canterbury",
    ...overrides,
  };
}

describe("POST /api/specials", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDb(TEST_DB);
  });

  afterEach(() => {
    db.close();
    try { unlinkSync(TEST_DB); } catch { /* ignore */ }
    try { unlinkSync(`${TEST_DB}-wal`); } catch { /* ignore */ }
    try { unlinkSync(`${TEST_DB}-shm`); } catch { /* ignore */ }
  });

  it("returns cheapest match per item", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", productName: "Whole Milk 2L", salePriceCents: 500 }),
      makeSpecial({ salefinderId: "2", productName: "Trim Milk 1L", salePriceCents: 300 }),
      makeSpecial({ salefinderId: "3", productName: "White Bread", salePriceCents: 250 }),
    ]);

    const result = handleSpecials(db, { items: ["milk", "bread"] });
    expect(result.results["milk"]?.productName).toBe("Trim Milk 1L");
    expect(result.results["bread"]?.productName).toBe("White Bread");
  });

  it("returns null for items with no matches", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", productName: "Butter 500g", salePriceCents: 400 }),
    ]);

    const result = handleSpecials(db, { items: ["butter", "caviar"] });
    expect(result.results["butter"]).not.toBeNull();
    expect(result.results["caviar"]).toBeNull();
  });

  it("filters by retailerIds", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", productName: "Milk A", retailerId: 1, salePriceCents: 500 }),
      makeSpecial({ salefinderId: "2", productName: "Milk B", retailerId: 2, salePriceCents: 300 }),
    ]);

    const result = handleSpecials(db, { items: ["milk"], retailerIds: [1] });
    expect(result.results["milk"]?.retailerId).toBe(1);
  });

  it("includes member prices only for specified retailers", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", productName: "Milk Member", retailerId: 1, memberPrice: true, salePriceCents: 200 }),
      makeSpecial({ salefinderId: "2", productName: "Milk Regular", retailerId: 1, memberPrice: false, salePriceCents: 500 }),
    ]);

    // Without membership — should get regular price
    const noMember = handleSpecials(db, { items: ["milk"] });
    expect(noMember.results["milk"]?.salePriceCents).toBe(500);

    // With membership — should get member price
    const withMember = handleSpecials(db, { items: ["milk"], memberRetailerIds: [1] });
    expect(withMember.results["milk"]?.salePriceCents).toBe(200);
  });
});
