import * as cheerio from "cheerio";
import { parsePrice } from "./prices.js";
import type { Special } from "../lib/types.js";

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
