import { describe, it, expect } from "vitest";
import { parsePrice } from "../src/scraper/prices.js";

describe("parsePrice", () => {
  it("parses simple price", () => {
    const result = parsePrice("$4.50");
    expect(result.salePriceCents).toBe(450);
    expect(result.memberPrice).toBe(false);
  });

  it("parses save amount", () => {
    const result = parsePrice("Save $1.00 $4.00 each");
    expect(result.savingsCents).toBe(100);
    expect(result.salePriceCents).toBe(400);
    expect(result.originalPriceCents).toBe(500);
  });

  it("parses multi-buy with each price", () => {
    const result = parsePrice("Save  $1.00 2 for  $7.00 Or  $4.00 each");
    expect(result.multiBuyQty).toBe(2);
    expect(result.multiBuyPriceCents).toBe(700);
    expect(result.salePriceCents).toBe(400);
    expect(result.savingsCents).toBe(100);
  });

  it("parses multi-buy without each price", () => {
    const result = parsePrice("2 for $13.00");
    expect(result.multiBuyQty).toBe(2);
    expect(result.multiBuyPriceCents).toBe(1300);
  });

  it("parses member price", () => {
    const result = parsePrice("$4.50 (member)");
    expect(result.salePriceCents).toBe(450);
    expect(result.memberPrice).toBe(true);
  });

  it("parses pack price", () => {
    const result = parsePrice("$8.00 pack");
    expect(result.salePriceCents).toBe(800);
  });

  it("parses price with whitespace noise", () => {
    const result = parsePrice("  Save  $6.00 \n $19.00 each  ");
    expect(result.savingsCents).toBe(600);
    expect(result.salePriceCents).toBe(1900);
  });

  it("parses 3-for deal", () => {
    const result = parsePrice("3 for $4.00 Or $2.00 each");
    expect(result.multiBuyQty).toBe(3);
    expect(result.multiBuyPriceCents).toBe(400);
    expect(result.salePriceCents).toBe(200);
  });

  it("parses 5-for deal", () => {
    const result = parsePrice("5 for $5.00 Or $1.70 each");
    expect(result.multiBuyQty).toBe(5);
    expect(result.multiBuyPriceCents).toBe(500);
    expect(result.salePriceCents).toBe(170);
  });

  it("handles whole dollar amounts", () => {
    const result = parsePrice("$14.00");
    expect(result.salePriceCents).toBe(1400);
  });

  it("stores raw text as unitPriceText", () => {
    const result = parsePrice("Save $1.00 2 for $7.00 Or $4.00 each");
    expect(result.unitPriceText).toContain("Save");
    expect(result.unitPriceText).toContain("$7.00");
  });
});
