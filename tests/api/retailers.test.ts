import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync } from "fs";
import { createDb, upsertRetailers } from "../../src/lib/db.js";
import type Database from "better-sqlite3";

const TEST_DB = "test-api-retailers.db";

describe("GET /api/retailers", () => {
  let db: Database.Database;

  beforeEach(() => { db = createDb(TEST_DB); });
  afterEach(() => {
    db.close();
    try { unlinkSync(TEST_DB); } catch { /* ignore */ }
    try { unlinkSync(`${TEST_DB}-wal`); } catch { /* ignore */ }
    try { unlinkSync(`${TEST_DB}-shm`); } catch { /* ignore */ }
  });

  it("returns retailers with id, name, and slug", () => {
    upsertRetailers(db, [
      { id: 1, name: "Pak'nSave", slug: "paknsave" },
      { id: 2, name: "New World", slug: "new-world" },
    ]);

    const rows = db
      .prepare("SELECT id, name, slug FROM retailers ORDER BY name")
      .all() as Array<{ id: number; name: string; slug: string }>;

    expect(rows).toEqual([
      { id: 2, name: "New World", slug: "new-world" },
      { id: 1, name: "Pak'nSave", slug: "paknsave" },
    ]);
  });
});
