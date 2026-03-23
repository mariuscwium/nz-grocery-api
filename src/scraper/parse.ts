import * as cheerio from "cheerio";
import { parsePrice } from "./prices.js";
import type { Special } from "../lib/types.js";

export interface Retailer {
  id: number;
  name: string;
  slug: string;
}

export function parseRetailers(html: string): Retailer[] {
  const $ = cheerio.load(html);
  const seen = new Map<number, Retailer>();

  $(".item-retailer-logo-top").each((_, el) => {
    const img = $(el).find("img");
    const href = $(el).find("a").attr("href") ?? "";
    const name = img.attr("alt") ?? "";
    const src = img.attr("src") ?? "";

    const idMatch = /retailerlogos\/(\d+)\./.exec(src);
    if (!idMatch?.[1] || !name) return;

    const id = parseInt(idMatch[1], 10);
    const slug = href.replace(/^\//, "").replace(/-catalogue$/, "").toLowerCase();

    if (!seen.has(id)) {
      seen.set(id, { id, name, slug });
    }
  });

  return [...seen.values()];
}

export function parseItems(html: string, categoryId: number, region: string): Special[] {
  const $ = cheerio.load(html);
  const items: Special[] = [];

  $(".item-details-container").each((_, el) => {
    const container = $(el);
    const nameEl = container.find(".item-name");
    const productName = nameEl.text().trim();
    if (!productName) return;

    const description = container.find(".item-description").text().trim();
    const priceText = container.find(".price-options").text().trim();
    const buyButton = container.find(".buy-now-button");

    const salefinderId = buyButton.attr("data-itemid") ?? "";
    const saleId = buyButton.attr("data-saleid") ?? "";
    const retailerIdStr = buyButton.attr("data-retailerid") ?? "0";
    const retailerId = parseInt(retailerIdStr, 10);
    const buyUrl = buyButton.attr("href") ?? "";

    const price = parsePrice(priceText);

    items.push({
      salefinderId,
      saleId,
      retailerId,
      productName,
      description,
      ...price,
      buyUrl,
      categoryId,
      region,
    });
  });

  return items;
}

export function hasNextPage(html: string, currentPage: number): boolean {
  const $ = cheerio.load(html);
  const nextPageLink = $(`a[href*="qs=${String(currentPage + 1)}"]`);
  return nextPageLink.length > 0;
}
