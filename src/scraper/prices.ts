export interface ParsedPrice {
  salePriceCents: number | null;
  originalPriceCents: number | null;
  savingsCents: number | null;
  multiBuyQty: number | null;
  multiBuyPriceCents: number | null;
  unitPriceText: string;
  memberPrice: boolean;
}

const PRICE_RE = /\$(\d+\.\d{2})/;
const SAVE_RE = /Save\s+\$(\d+\.\d{2})/;
const MULTI_BUY_PRICE_RE = /for \$(\d+\.\d{2})/;
const EACH_RE = /\$(\d+\.\d{2})\s*each/;

function dollarsToCents(str: string): number | null {
  const match = PRICE_RE.exec(str);
  if (!match?.[1]) return null;
  return Math.round(parseFloat(match[1]) * 100);
}

function parseSavings(text: string, result: ParsedPrice): void {
  const match = SAVE_RE.exec(text);
  if (match?.[1]) {
    result.savingsCents = Math.round(parseFloat(match[1]) * 100);
  }
}

function parseMultiBuy(text: string, result: ParsedPrice): void {
  const forIdx = text.indexOf(" for $");
  if (forIdx === -1) return;
  const qtyStr = text.slice(Math.max(0, forIdx - 2), forIdx).trim();
  const qty = parseInt(qtyStr, 10);
  if (isNaN(qty)) return;
  const priceMatch = MULTI_BUY_PRICE_RE.exec(text);
  if (priceMatch?.[1]) {
    result.multiBuyQty = qty;
    result.multiBuyPriceCents = Math.round(parseFloat(priceMatch[1]) * 100);
  }
}

function parseEachPrice(text: string, result: ParsedPrice): void {
  const match = EACH_RE.exec(text);
  if (match?.[1]) {
    result.salePriceCents = Math.round(parseFloat(match[1]) * 100);
  }
}

function parseFallbackPrice(text: string, result: ParsedPrice): void {
  if (result.salePriceCents !== null || result.multiBuyQty !== null) return;
  result.salePriceCents = dollarsToCents(text);
}

function deriveOriginalPrice(result: ParsedPrice): void {
  if (result.savingsCents !== null && result.salePriceCents !== null) {
    result.originalPriceCents = result.salePriceCents + result.savingsCents;
  }
}

export function parsePrice(raw: string): ParsedPrice {
  const text = raw.replace(/\s+/g, " ").trim();
  const result: ParsedPrice = {
    salePriceCents: null,
    originalPriceCents: null,
    savingsCents: null,
    multiBuyQty: null,
    multiBuyPriceCents: null,
    unitPriceText: text,
    memberPrice: /member/i.test(text),
  };

  parseSavings(text, result);
  parseMultiBuy(text, result);
  parseEachPrice(text, result);
  parseFallbackPrice(text, result);
  deriveOriginalPrice(result);

  return result;
}
