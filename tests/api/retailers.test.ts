import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync } from "fs";
import { createDb, upsertSpecials } from "../../src/lib/db.js";
import type Database from "better-sqlite3";
import type { Special } from "../../src/lib/types.js";

const TEST_DB = "test-api-retailers.db";

function makeSpecial(overrides: Partial<Special> = {}): Special {
  return {
    salefinderId: "item-1", saleId: "sale-1", retailerId: 1,
    productName: "Test", description: "", salePriceCents: 500,
    originalPriceCents: null, savingsCents: null, multiBuyQty: null,
    multiBuyPriceCents: null, unitPriceText: "", memberPrice: false,
    buyUrl: "", categoryId: 191, region: "Canterbury",
    ...overrides,
  };
}

describe("GET /api/retailers", () => {
  let db: Database.Database;

  beforeEach(() => { db = createDb(TEST_DB); });
  afterEach(() => {
    db.close();
    try { unlinkSync(TEST_DB); } catch { /* ignore */ }
    try { unlinkSync(`${TEST_DB}-wal`); } catch { /* ignore */ }
    try { unlinkSync(`${TEST_DB}-shm`); } catch { /* ignore */ }
  });

  it("returns distinct retailer IDs", () => {
    upsertSpecials(db, [
      makeSpecial({ salefinderId: "1", retailerId: 1 }),
      makeSpecial({ salefinderId: "2", retailerId: 2 }),
      makeSpecial({ salefinderId: "3", retailerId: 1 }),
    ]);

    const rows = db
      .prepare("SELECT DISTINCT retailer_id as id FROM specials ORDER BY id")
      .all() as Array<{ id: number }>;

    expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
