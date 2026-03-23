import { fetchPage } from "./fetch.js";
import { parseItems, hasNextPage } from "./parse.js";
import { CATEGORIES } from "../lib/types.js";
import type { Special } from "../lib/types.js";

const REGION = process.env["REGION"] ?? "Canterbury";
const MAX_PAGES = 30;

async function scrapeCategory(
  categoryId: number,
  path: string,
  region: string,
): Promise<Special[]> {
  const allItems: Special[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchPage(path, page, region);
    const items = parseItems(html, categoryId, region);

    if (items.length === 0) break;
    allItems.push(...items);

    if (!hasNextPage(html, page)) break;
  }

  return allItems;
}

async function main(): Promise<void> {
  const allSpecials: Special[] = [];

  for (const cat of CATEGORIES) {
    const items = await scrapeCategory(cat.id, cat.path, REGION);
    allSpecials.push(...items);
  }

  // For now, output JSON. Supabase upsert comes next.
  process.stdout.write(JSON.stringify(allSpecials, null, 2));
}

void main();
