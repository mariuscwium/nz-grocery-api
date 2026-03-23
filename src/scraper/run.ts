import { createFetcher } from "./fetch.js";
import { parseItems, hasNextPage } from "./parse.js";
import { CATEGORIES } from "../lib/types.js";
import type { Special } from "../lib/types.js";
import type { Deps } from "../lib/deps.js";

const MAX_PAGES = 30;

export async function scrapeCategory(
  deps: Deps,
  categoryId: number,
  path: string,
  region: string,
): Promise<Special[]> {
  const allItems: Special[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await deps.fetcher.fetch(path, page, region);
    const items = parseItems(html, categoryId, region);

    if (items.length === 0) break;
    allItems.push(...items);

    if (!hasNextPage(html, page)) break;
  }

  return allItems;
}

export async function scrapeAll(deps: Deps, region: string): Promise<Special[]> {
  const allSpecials: Special[] = [];

  for (const cat of CATEGORIES) {
    const items = await scrapeCategory(deps, cat.id, cat.path, region);
    allSpecials.push(...items);
  }

  return allSpecials;
}

async function main(): Promise<void> {
  const region = process.env["REGION"] ?? "Canterbury";
  const deps: Deps = {
    fetcher: createFetcher(),
    output: { write: (data: string) => process.stdout.write(data) },
  };

  const specials = await scrapeAll(deps, region);
  deps.output.write(JSON.stringify(specials, null, 2));
}

void main();
