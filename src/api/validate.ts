type ValidationResult = { ok: true; body: ValidBody } | { ok: false; error: string };

export interface ValidBody {
  items: string[];
  retailerIds?: number[];
  memberRetailerIds?: number[];
  region?: string;
}

function validateItems(body: Record<string, unknown>): string | null {
  if (!Array.isArray(body["items"])) {
    return "items must be an array of strings";
  }
  if (body["items"].length === 0) {
    return "items must not be empty";
  }
  if (body["items"].length > 20) {
    return "items must contain at most 20 items";
  }
  const items = body["items"] as string[];
  if (items.some(item => typeof item !== "string" || item.trim() === "")) {
    return "items must not contain empty strings";
  }
  return null;
}

function validateOptionalArray(body: Record<string, unknown>, field: string): string | null {
  if (body[field] !== undefined && !Array.isArray(body[field])) {
    return `${field} must be an array of numbers`;
  }
  return null;
}

function validateOptionalString(body: Record<string, unknown>, field: string): string | null {
  if (body[field] !== undefined && typeof body[field] !== "string") {
    return `${field} must be a string`;
  }
  return null;
}

export function validateSpecialsBody(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const body = raw as Record<string, unknown>;

  const itemsError = validateItems(body);
  if (itemsError) {
    return { ok: false, error: itemsError };
  }

  const retailerError = validateOptionalArray(body, "retailerIds");
  if (retailerError) return { ok: false, error: retailerError };

  const memberError = validateOptionalArray(body, "memberRetailerIds");
  if (memberError) return { ok: false, error: memberError };

  const regionError = validateOptionalString(body, "region");
  if (regionError) return { ok: false, error: regionError };

  const result: ValidBody = { items: body["items"] as string[] };
  if (body["retailerIds"] !== undefined) result.retailerIds = body["retailerIds"] as number[];
  if (body["memberRetailerIds"] !== undefined) result.memberRetailerIds = body["memberRetailerIds"] as number[];
  if (body["region"] !== undefined) result.region = body["region"] as string;

  return { ok: true, body: result };
}
