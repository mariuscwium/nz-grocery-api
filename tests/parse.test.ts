import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseItems, parseRetailers, hasNextPage } from "../src/scraper/parse.js";

const fixture = readFileSync("tests/fixtures/groceries-page1.html", "utf-8");

describe("parseItems", () => {
  it("extracts items from real HTML fixture", () => {
    const items = parseItems(fixture, 191, "Canterbury");
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(12);
  });

  it("extracts product name from each item", () => {
    const items = parseItems(fixture, 191, "Canterbury");
    for (const item of items) {
      expect(item.productName).toBeTruthy();
      expect(item.productName.length).toBeGreaterThan(2);
    }
  });

  it("extracts retailer ID from buy button data attribute", () => {
    const items = parseItems(fixture, 191, "Canterbury");
    for (const item of items) {
      expect(item.retailerId).toBeGreaterThan(0);
    }
  });

  it("extracts salefinder item ID", () => {
    const items = parseItems(fixture, 191, "Canterbury");
    for (const item of items) {
      expect(item.salefinderId).toBeTruthy();
    }
  });

  it("sets category ID and region from parameters", () => {
    const items = parseItems(fixture, 191, "Canterbury");
    for (const item of items) {
      expect(item.categoryId).toBe(191);
      expect(item.region).toBe("Canterbury");
    }
  });

  it("parses at least some prices", () => {
    const items = parseItems(fixture, 191, "Canterbury");
    const withPrices = items.filter(
      (i) => i.salePriceCents !== null || i.multiBuyPriceCents !== null,
    );
    expect(withPrices.length).toBeGreaterThan(0);
  });

  it("extracts buy URLs", () => {
    const items = parseItems(fixture, 191, "Canterbury");
    const withUrls = items.filter((i) => i.buyUrl.startsWith("http"));
    expect(withUrls.length).toBeGreaterThan(0);
  });
});

describe("parseRetailers", () => {
  it("extracts distinct retailers from HTML", () => {
    const retailers = parseRetailers(fixture);
    expect(retailers.length).toBeGreaterThan(0);
  });

  it("extracts retailer id, name, and slug", () => {
    const retailers = parseRetailers(fixture);
    for (const r of retailers) {
      expect(r.id).toBeGreaterThan(0);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.slug.length).toBeGreaterThan(0);
    }
  });

  it("deduplicates retailers", () => {
    const retailers = parseRetailers(fixture);
    const ids = retailers.map((r) => r.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("derives slug from catalogue href", () => {
    const retailers = parseRetailers(fixture);
    for (const r of retailers) {
      expect(r.slug).not.toContain("/");
      expect(r.slug).not.toContain("-catalogue");
      expect(r.slug).toBe(r.slug.toLowerCase());
    }
  });
});

describe("hasNextPage", () => {
  it("detects next page link in fixture", () => {
    expect(hasNextPage(fixture, 1)).toBe(true);
  });

  it("returns false for a page beyond the last", () => {
    expect(hasNextPage(fixture, 99)).toBe(false);
  });
});
