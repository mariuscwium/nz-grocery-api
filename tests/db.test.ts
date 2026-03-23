import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync } from "fs";
import { createDb, upsertSpecials, upsertRetailers, querySpecials } from "../src/lib/db.js";
import type Database from "better-sqlite3";
import type { Special } from "../src/lib/types.js";

const TEST_DB = "test-specials.db";

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

describe("database", () => {
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

  it("creates tables on init", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name);
    expect(names).toContain("specials");
    expect(names).toContain("retailers");
  });

  it("inserts specials", () => {
    const count = upsertSpecials(db, [makeSpecial()]);
    expect(count).toBe(1);

    const rows = querySpecials(db, {});
    expect(rows).toHaveLength(1);
    expect(rows[0]?.product_name).toBe("Test Butter 500g");
  });

  it("upserts on conflict (same item + sale + region)", () => {
    upsertSpecials(db, [makeSpecial({ salePriceCents: 650 })]);
    upsertSpecials(db, [makeSpecial({ salePriceCents: 600 })]);

    const rows = querySpecials(db, {});
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sale_price_cents).toBe(600);
  });

  it("inserts multiple items", () => {
    const items = [
      makeSpecial({ salefinderId: "item-1", productName: "Butter" }),
      makeSpecial({ salefinderId: "item-2", productName: "Milk" }),
      makeSpecial({ salefinderId: "item-3", productName: "Bread" }),
    ];
    const count = upsertSpecials(db, items);
    expect(count).toBe(3);
  });

  it("queries by keyword", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", productName: "Anchor Butter 500g" }),
      makeSpecial({ salefinderId: "2", productName: "Trim Milk 2L" }),
    ]);

    const results = querySpecials(db, { q: "butter" });
    expect(results).toHaveLength(1);
    expect(results[0]?.product_name).toContain("Butter");
  });

  it("queries by category", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", categoryId: 191 }),
      makeSpecial({ salefinderId: "2", categoryId: 190 }),
    ]);

    const results = querySpecials(db, { categoryId: 191 });
    expect(results).toHaveLength(1);
  });

  it("queries by max price", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", salePriceCents: 300 }),
      makeSpecial({ salefinderId: "2", salePriceCents: 1500 }),
    ]);

    const results = querySpecials(db, { maxPriceCents: 500 });
    expect(results).toHaveLength(1);
    expect(results[0]?.sale_price_cents).toBe(300);
  });

  it("respects limit and offset", () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeSpecial({ salefinderId: `item-${String(i)}`, salePriceCents: (i + 1) * 100 }),
    );
    upsertSpecials(db, items);

    const page1 = querySpecials(db, { limit: 2, offset: 0 });
    const page2 = querySpecials(db, { limit: 2, offset: 2 });
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page1[0]?.sale_price_cents).not.toBe(page2[0]?.sale_price_cents);
  });

  it("stores member price flag", () => {
    upsertSpecials(db, [makeSpecial({ memberPrice: true })]);

    const rows = querySpecials(db, { memberRetailerIds: [1] });
    expect(rows[0]?.member_price).toBe(1);
  });

  it("filters by multiple retailer IDs", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", retailerId: 1, productName: "A" }),
      makeSpecial({ salefinderId: "2", retailerId: 2, productName: "B" }),
      makeSpecial({ salefinderId: "3", retailerId: 3, productName: "C" }),
    ]);

    const results = querySpecials(db, { retailerIds: [1, 3] });
    expect(results).toHaveLength(2);
    expect(results.map(r => r.retailer_id)).toEqual([1, 3]);
  });

  it("excludes member-only prices by default", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", memberPrice: false, salePriceCents: 500 }),
      makeSpecial({ salefinderId: "2", memberPrice: true, salePriceCents: 300 }),
    ]);

    const results = querySpecials(db, {});
    expect(results).toHaveLength(1);
    expect(results[0]?.sale_price_cents).toBe(500);
  });

  it("includes member prices for specified retailers only", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", retailerId: 1, memberPrice: true, salePriceCents: 300 }),
      makeSpecial({ salefinderId: "2", retailerId: 2, memberPrice: true, salePriceCents: 200 }),
      makeSpecial({ salefinderId: "3", retailerId: 1, memberPrice: false, salePriceCents: 500 }),
    ]);

    const results = querySpecials(db, { memberRetailerIds: [1] });
    expect(results).toHaveLength(2);
    expect(results.map(r => r.retailer_id)).toEqual([1, 1]);
  });

  it("excludes items with null sale_price_cents", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", salePriceCents: 300 }),
      makeSpecial({ salefinderId: "2", salePriceCents: null }),
    ]);

    const results = querySpecials(db, {});
    expect(results).toHaveLength(1);
    expect(results[0]?.sale_price_cents).toBe(300);
  });

  it("upserts retailers", () => {
    upsertRetailers(db, [
      { id: 1, name: "Pak'nSave", slug: "paknsave" },
      { id: 2, name: "New World", slug: "new-world" },
    ]);

    const rows = db.prepare("SELECT * FROM retailers ORDER BY id").all() as Array<{ id: number; name: string; slug: string }>;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toBe("Pak'nSave");
  });

  it("updates retailer name on conflict", () => {
    upsertRetailers(db, [{ id: 1, name: "Old Name", slug: "old" }]);
    upsertRetailers(db, [{ id: 1, name: "New Name", slug: "new" }]);

    const rows = db.prepare("SELECT * FROM retailers").all() as Array<{ id: number; name: string; slug: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("New Name");
  });
});
