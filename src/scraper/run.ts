import { createFetcher } from "./fetch.js";
import { parseItems, parseRetailers, hasNextPage } from "./parse.js";
import type { Retailer } from "./parse.js";
import { CATEGORIES } from "../lib/types.js";
import type { Special } from "../lib/types.js";
import type { Deps } from "../lib/deps.js";

const MAX_PAGES = 30;

export interface ScrapeResult {
  specials: Special[];
  retailers: Retailer[];
}

export async function scrapeCategory(
  deps: Deps,
  categoryId: number,
  path: string,
  region: string,
): Promise<ScrapeResult> {
  const allItems: Special[] = [];
  const retailerMap = new Map<number, Retailer>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await deps.fetcher.fetch(path, page, region);
    const items = parseItems(html, categoryId, region);

    if (items.length === 0) break;
    allItems.push(...items);

    for (const r of parseRetailers(html)) {
      if (!retailerMap.has(r.id)) retailerMap.set(r.id, r);
    }

    if (!hasNextPage(html, page)) break;
  }

  return { specials: allItems, retailers: [...retailerMap.values()] };
}

export async function scrapeAll(deps: Deps, region: string): Promise<ScrapeResult> {
  const allSpecials: Special[] = [];
  const retailerMap = new Map<number, Retailer>();

  for (const cat of CATEGORIES) {
    const result = await scrapeCategory(deps, cat.id, cat.path, region);
    allSpecials.push(...result.specials);
    for (const r of result.retailers) {
      if (!retailerMap.has(r.id)) retailerMap.set(r.id, r);
    }
  }

  return { specials: allSpecials, retailers: [...retailerMap.values()] };
}

async function main(): Promise<void> {
  const { createDb, upsertSpecials, upsertRetailers } = await import("../lib/db.js");
  const region = process.env["REGION"] ?? "Canterbury";
  const dbPath = process.env["DB_PATH"] ?? "specials.db";
  const deps: Deps = {
    fetcher: createFetcher(),
    output: { write: (data: string) => process.stdout.write(data) },
  };

  const result = await scrapeAll(deps, region);
  const db = createDb(dbPath);
  upsertRetailers(db, result.retailers);
  const count = upsertSpecials(db, result.specials);
  db.close();
  deps.output.write(`Scraped ${String(count)} specials, ${String(result.retailers.length)} retailers into ${dbPath}\n`);
}

void main();
