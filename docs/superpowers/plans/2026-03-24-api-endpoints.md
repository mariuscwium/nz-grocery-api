# API Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add POST /api/specials (basket query) and GET /api/retailers endpoints to the NZ Grocery Specials API.

**Architecture:** Extend `querySpecials` in `src/lib/db.ts` to support multi-retailer filtering and member pricing logic. Add Vercel serverless functions in root `api/` directory. Each endpoint is a single file with input validation and JSON response.

**Tech Stack:** TypeScript, better-sqlite3, Vercel serverless functions, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-api-endpoints-design.md`

---

### Task 1: Extend querySpecials — retailerIds (plural) and null price exclusion

**Files:**
- Modify: `src/lib/db.ts:103-147` (QueryParams + querySpecials)
- Modify: `tests/db.test.ts` (update existing tests, add new ones)
- Modify: `scripts/query.ts:17,26` (update call sites)

- [ ] **Step 1: Update existing test for retailerId → retailerIds**

In `tests/db.test.ts`, there's no existing test filtering by `retailerId`, so no breakage. Add a new test for multi-retailer filtering:

```typescript
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
```

- [ ] **Step 2: Add test for null price exclusion**

```typescript
it("excludes items with null sale_price_cents", () => {
  upsertSpecials(db, [
    makeSpecial({ salefinderId: "1", salePriceCents: 300 }),
    makeSpecial({ salefinderId: "2", salePriceCents: null }),
  ]);

  const results = querySpecials(db, {});
  expect(results).toHaveLength(1);
  expect(results[0]?.sale_price_cents).toBe(300);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /home/marius/nz-grocery-api && npx vitest run tests/db.test.ts`
Expected: FAIL — `retailerIds` not recognized, null prices still returned

- [ ] **Step 4: Update QueryParams and querySpecials in db.ts**

In `src/lib/db.ts`, replace the `QueryParams` interface and `querySpecials` function:

```typescript
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

export function querySpecials(db: Database.Database, params: QueryParams): SpecialRow[] {
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
    const placeholders = params.retailerIds.map((_, i) => `@rid${String(i)}`).join(", ");
    conditions.push(`retailer_id IN (${placeholders})`);
    for (let i = 0; i < params.retailerIds.length; i++) {
      values[`rid${String(i)}`] = params.retailerIds[i];
    }
  }
  if (params.maxPriceCents !== undefined) {
    conditions.push("sale_price_cents <= @maxPriceCents");
    values["maxPriceCents"] = params.maxPriceCents;
  }
  if (params.memberRetailerIds !== undefined && params.memberRetailerIds.length > 0) {
    const memberPlaceholders = params.memberRetailerIds.map((_, i) => `@mrid${String(i)}`).join(", ");
    conditions.push(`(member_price = 0 OR retailer_id IN (${memberPlaceholders}))`);
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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const sql = `SELECT * FROM specials ${where} ORDER BY sale_price_cents ASC LIMIT @limit OFFSET @offset`;
  values["limit"] = limit;
  values["offset"] = offset;

  return db.prepare(sql).all(values) as SpecialRow[];
}
```

- [ ] **Step 5: Update scripts/query.ts call sites**

No changes needed — `query.ts` doesn't pass `retailerId`, only `q` and `limit`. These still work.

- [ ] **Step 6: Update existing db tests that expect member_price rows to be returned**

The `"stores member price flag"` test inserts a member_price=true item and queries with `{}`. With the new default member_price exclusion, this test will break. Update it:

```typescript
it("stores member price flag", () => {
  upsertSpecials(db, [makeSpecial({ memberPrice: true })]);

  const rows = querySpecials(db, { memberRetailerIds: [1] });
  expect(rows[0]?.member_price).toBe(1);
});
```

Also, the `"excludes items with null sale_price_cents"` test needs a non-member item. Update `makeSpecial` default to have `memberPrice: false` (already the case — good).

- [ ] **Step 7: Run all tests**

Run: `cd /home/marius/nz-grocery-api && npx vitest run tests/db.test.ts`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/db.ts tests/db.test.ts
git commit -m "feat: extend querySpecials with retailerIds, memberRetailerIds, exclude null prices"
```

---

### Task 2: Add member pricing filter tests

**Files:**
- Modify: `tests/db.test.ts`

- [ ] **Step 1: Write test — excludes member prices by default**

```typescript
it("excludes member-only prices by default", () => {
  upsertSpecials(db, [
    makeSpecial({ salefinderId: "1", memberPrice: false, salePriceCents: 500 }),
    makeSpecial({ salefinderId: "2", memberPrice: true, salePriceCents: 300 }),
  ]);

  const results = querySpecials(db, {});
  expect(results).toHaveLength(1);
  expect(results[0]?.sale_price_cents).toBe(500);
});
```

- [ ] **Step 2: Write test — includes member prices for specified retailers**

```typescript
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
```

- [ ] **Step 3: Run tests**

Run: `cd /home/marius/nz-grocery-api && npx vitest run tests/db.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add tests/db.test.ts
git commit -m "test: add member pricing filter tests"
```

---

### Task 3: Add response serializer

**Files:**
- Create: `src/api/serialize.ts`
- Create: `tests/api/serialize.test.ts`

- [ ] **Step 1: Write failing test for serializer**

```typescript
// tests/api/serialize.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/marius/nz-grocery-api && npx vitest run tests/api/serialize.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement serializer**

```typescript
// src/api/serialize.ts
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
```

- [ ] **Step 4: Run tests**

Run: `cd /home/marius/nz-grocery-api && npx vitest run tests/api/serialize.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/serialize.ts tests/api/serialize.test.ts
git commit -m "feat: add camelCase serializer for SpecialRow responses"
```

---

### Task 4: Add POST /api/specials endpoint

**Files:**
- Create: `api/specials.ts` (root-level Vercel function)
- Create: `tests/api/specials.test.ts`

- [ ] **Step 1: Write failing test for specials endpoint**

Test the handler logic directly (not HTTP). The Vercel handler receives `(req, res)` but we test the core logic function separately.

```typescript
// tests/api/specials.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/marius/nz-grocery-api && npx vitest run tests/api/specials.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement handler logic**

```typescript
// src/api/handler.ts
import type Database from "better-sqlite3";
import { querySpecials } from "../lib/db.js";
import { serializeSpecial, type SpecialResponse } from "./serialize.js";
import type { ValidBody } from "./validate.js";

export interface SpecialsResponse {
  results: Record<string, SpecialResponse | null>;
  meta: { region: string; queriedAt: string };
}

export function handleSpecials(db: Database.Database, body: ValidBody): SpecialsResponse {
  const region = body.region ?? "Canterbury";
  const results: Record<string, SpecialResponse | null> = {};

  for (const item of body.items) {
    const rows = querySpecials(db, {
      q: item,
      retailerIds: body.retailerIds,
      memberRetailerIds: body.memberRetailerIds,
      region,
      limit: 1,
    });
    results[item] = rows.length > 0 ? serializeSpecial(rows[0]!) : null;
  }

  return {
    results,
    meta: { region, queriedAt: new Date().toISOString() },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd /home/marius/nz-grocery-api && npx vitest run tests/api/specials.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/handler.ts tests/api/specials.test.ts
git commit -m "feat: add specials basket query handler with tests"
```

---

### Task 5: Add input validation

**Files:**
- Create: `src/api/validate.ts`
- Create: `tests/api/validate.test.ts`

- [ ] **Step 1: Write failing tests for validation**

```typescript
// tests/api/validate.test.ts
import { describe, it, expect } from "vitest";
import { validateSpecialsBody } from "../../src/api/validate.js";

describe("validateSpecialsBody", () => {
  it("accepts valid body", () => {
    const result = validateSpecialsBody({ items: ["milk"] });
    expect(result.ok).toBe(true);
  });

  it("rejects missing items", () => {
    const result = validateSpecialsBody({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("items");
  });

  it("rejects empty items array", () => {
    const result = validateSpecialsBody({ items: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects non-array items", () => {
    const result = validateSpecialsBody({ items: "milk" });
    expect(result.ok).toBe(false);
  });

  it("rejects empty string items", () => {
    const result = validateSpecialsBody({ items: ["milk", "", "bread"] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("empty");
  });

  it("rejects items exceeding max 20", () => {
    const result = validateSpecialsBody({ items: Array.from({ length: 21 }, (_, i) => `item${String(i)}`) });
    expect(result.ok).toBe(false);
  });

  it("accepts optional retailerIds and memberRetailerIds", () => {
    const result = validateSpecialsBody({
      items: ["milk"],
      retailerIds: [1, 2],
      memberRetailerIds: [1],
      region: "Canterbury",
    });
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/marius/nz-grocery-api && npx vitest run tests/api/validate.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement validation**

```typescript
// src/api/validate.ts
type ValidationResult = { ok: true; body: ValidBody } | { ok: false; error: string };

export interface ValidBody {
  items: string[];
  retailerIds?: number[];
  memberRetailerIds?: number[];
  region?: string;
}

export function validateSpecialsBody(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const body = raw as Record<string, unknown>;

  if (!Array.isArray(body["items"])) {
    return { ok: false, error: "items must be an array of strings" };
  }
  if (body["items"].length === 0) {
    return { ok: false, error: "items must not be empty" };
  }
  if (body["items"].length > 20) {
    return { ok: false, error: "items must contain at most 20 items" };
  }
  const items = body["items"] as string[];
  if (items.some(item => typeof item !== "string" || item.trim() === "")) {
    return { ok: false, error: "items must not contain empty strings" };
  }

  const result: ValidBody = { items };

  if (body["retailerIds"] !== undefined) {
    if (!Array.isArray(body["retailerIds"])) {
      return { ok: false, error: "retailerIds must be an array of numbers" };
    }
    result.retailerIds = body["retailerIds"] as number[];
  }

  if (body["memberRetailerIds"] !== undefined) {
    if (!Array.isArray(body["memberRetailerIds"])) {
      return { ok: false, error: "memberRetailerIds must be an array of numbers" };
    }
    result.memberRetailerIds = body["memberRetailerIds"] as number[];
  }

  if (body["region"] !== undefined) {
    if (typeof body["region"] !== "string") {
      return { ok: false, error: "region must be a string" };
    }
    result.region = body["region"];
  }

  return { ok: true, body: result };
}
```

- [ ] **Step 4: Run tests**

Run: `cd /home/marius/nz-grocery-api && npx vitest run tests/api/validate.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/validate.ts tests/api/validate.test.ts
git commit -m "feat: add input validation for specials endpoint"
```

---

### Task 6: Add Vercel serverless functions and retailers test

**Files:**
- Create: `api/specials.ts` (root-level)
- Create: `api/retailers.ts` (root-level)
- Create: `tests/api/retailers.test.ts`
- Modify: `tsconfig.json` (add `api` to include)

- [ ] **Step 1: Update tsconfig.json to include api directory**

Add `"api"` to the `include` array in `tsconfig.json`:

```json
"include": ["src", "tests", "api"]
```

- [ ] **Step 2: Create api/specials.ts Vercel function**

```typescript
// api/specials.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createDb } from "../src/lib/db.js";
import { validateSpecialsBody } from "../../src/api/validate.js";
import { handleSpecials } from "../src/api/handler.js";

const db = createDb("specials.db");

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const validation = validateSpecialsBody(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const result = handleSpecials(db, validation.body);
  res.status(200).json(result);
}
```

- [ ] **Step 3: Create api/retailers.ts Vercel function**

```typescript
// api/retailers.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createDb } from "../src/lib/db.js";

const db = createDb("specials.db");

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rows = db
    .prepare("SELECT DISTINCT retailer_id as id FROM specials ORDER BY id")
    .all() as Array<{ id: number }>;

  res.status(200).json({ retailers: rows });
}
```

- [ ] **Step 4: Add retailers query test**

```typescript
// tests/api/retailers.test.ts
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
```

Run: `cd /home/marius/nz-grocery-api && npx vitest run tests/api/retailers.test.ts`
Expected: PASS

- [ ] **Step 5: Install @vercel/node types**

Run: `cd /home/marius/nz-grocery-api && npm install -D @vercel/node`

- [ ] **Step 6: Run typecheck**

Run: `cd /home/marius/nz-grocery-api && npm run typecheck`
Expected: PASS — no type errors

- [ ] **Step 7: Commit**

```bash
git add api/specials.ts api/retailers.ts tests/api/retailers.test.ts tsconfig.json package.json package-lock.json
git commit -m "feat: add Vercel serverless functions for specials and retailers"
```

---

### Task 7: Run full quality gate

**Files:** None (verification only)

- [ ] **Step 1: Run full quality check**

Run: `cd /home/marius/nz-grocery-api && npm run quality`
Expected: typecheck PASS, lint PASS, tests PASS with coverage thresholds met

- [ ] **Step 2: Fix any issues**

Address lint errors, type errors, or coverage gaps.

- [ ] **Step 3: Manual smoke test with dev server**

Run: `cd /home/marius/nz-grocery-api && npx vercel dev` (if specials.db exists with data)

Test with:
```bash
curl -X POST http://localhost:3000/api/specials \
  -H "Content-Type: application/json" \
  -d '{"items": ["milk", "bread"]}'

curl http://localhost:3000/api/retailers
```

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address quality gate issues"
```
