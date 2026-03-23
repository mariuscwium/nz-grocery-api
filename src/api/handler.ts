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
    const first = rows[0];
    results[item] = first !== undefined ? serializeSpecial(first) : null;
  }

  return {
    results,
    meta: { region, queriedAt: new Date().toISOString() },
  };
}
