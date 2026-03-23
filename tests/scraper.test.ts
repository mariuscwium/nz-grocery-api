import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { FetcherTwin } from "../twins/fetcher.js";
import { OutputTwin } from "../twins/output.js";
import { scrapeCategory, scrapeAll } from "../src/scraper/run.js";
import type { Deps } from "../src/lib/deps.js";

const fixture = readFileSync("tests/fixtures/groceries-page1.html", "utf-8");

describe("scrapeCategory", () => {
  let fetcher: FetcherTwin;
  let output: OutputTwin;
  let deps: Deps;

  beforeEach(() => {
    fetcher = new FetcherTwin();
    output = new OutputTwin();
    deps = { fetcher, output };
  });

  it("scrapes a single page of results", async () => {
    fetcher.addPage("/food-and-beverage/groceries/c-191", 1, fixture);

    const result = await scrapeCategory(
      deps,
      191,
      "/food-and-beverage/groceries/c-191",
      "Canterbury",
    );

    expect(result.specials.length).toBeGreaterThan(0);
    expect(result.specials[0]?.categoryId).toBe(191);
    expect(result.specials[0]?.region).toBe("Canterbury");
  });

  it("passes region to fetcher", async () => {
    fetcher.addPage("/food-and-beverage/groceries/c-191", 1, fixture);

    await scrapeCategory(deps, 191, "/food-and-beverage/groceries/c-191", "Canterbury");

    expect(fetcher.calls[0]?.region).toBe("Canterbury");
  });

  it("stops when page returns no items", async () => {
    fetcher.addPage("/food-and-beverage/groceries/c-191", 1, fixture);
    // Page 2 returns empty (not added to twin)

    await scrapeCategory(deps, 191, "/food-and-beverage/groceries/c-191", "Canterbury");

    // Should have fetched page 1 and page 2 (which returned empty)
    expect(fetcher.calls.length).toBe(2);
  });

  it("paginates through multiple pages", async () => {
    fetcher.addPage("/test/c-1", 1, fixture);
    fetcher.addPage("/test/c-1", 2, fixture);
    // Page 3 empty, stops

    const result = await scrapeCategory(deps, 1, "/test/c-1", "Canterbury");

    expect(result.specials.length).toBeGreaterThan(12);
    expect(fetcher.calls.length).toBe(3);
  });
});

describe("scrapeAll", () => {
  let fetcher: FetcherTwin;
  let output: OutputTwin;
  let deps: Deps;

  beforeEach(() => {
    fetcher = new FetcherTwin();
    output = new OutputTwin();
    deps = { fetcher, output };
  });

  it("scrapes all configured categories", async () => {
    fetcher.addPage("/food-and-beverage/groceries/c-191", 1, fixture);
    fetcher.addPage("/food-and-beverage/beverages/c-190", 1, fixture);
    fetcher.addPage("/home-and-living/home-essentials/c-168", 1, fixture);
    fetcher.addPage("/health-and-beauty/healthcare-and-medications/c-129", 1, fixture);

    const result = await scrapeAll(deps, "Canterbury");

    expect(result.specials.length).toBeGreaterThan(0);

    const paths = fetcher.calls.map((c) => c.path);
    expect(paths).toContain("/food-and-beverage/groceries/c-191");
    expect(paths).toContain("/food-and-beverage/beverages/c-190");
    expect(paths).toContain("/home-and-living/home-essentials/c-168");
    expect(paths).toContain("/health-and-beauty/healthcare-and-medications/c-129");
  });

  it("extracts retailers from scraped pages", async () => {
    fetcher.addPage("/food-and-beverage/groceries/c-191", 1, fixture);
    fetcher.addPage("/food-and-beverage/beverages/c-190", 1, fixture);
    fetcher.addPage("/home-and-living/home-essentials/c-168", 1, fixture);
    fetcher.addPage("/health-and-beauty/healthcare-and-medications/c-129", 1, fixture);

    const result = await scrapeAll(deps, "Canterbury");

    expect(result.retailers.length).toBeGreaterThan(0);
    for (const r of result.retailers) {
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.slug.length).toBeGreaterThan(0);
    }
  });

  it("returns items from multiple categories", async () => {
    fetcher.addPage("/food-and-beverage/groceries/c-191", 1, fixture);
    fetcher.addPage("/food-and-beverage/beverages/c-190", 1, fixture);

    const result = await scrapeAll(deps, "Canterbury");

    const categoryIds = new Set(result.specials.map((i) => i.categoryId));
    expect(categoryIds.has(191)).toBe(true);
    expect(categoryIds.has(190)).toBe(true);
  });
});
