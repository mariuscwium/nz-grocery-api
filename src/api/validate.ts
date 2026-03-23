type ValidationResult = { ok: true; body: ValidBody } | { ok: false; error: string };

export interface ValidBody {
  items: string[];
  retailerIds?: number[];
  memberRetailerIds?: number[];
  region?: string;
}

export function validateSpecialsBody(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const body = raw as Record<string, unknown>;

  if (!Array.isArray(body["items"])) {
    return { ok: false, error: "items must be an array of strings" };
  }
  if (body["items"].length === 0) {
    return { ok: false, error: "items must not be empty" };
  }
  if (body["items"].length > 20) {
    return { ok: false, error: "items must contain at most 20 items" };
  }
  const items = body["items"] as string[];
  if (items.some(item => typeof item !== "string" || item.trim() === "")) {
    return { ok: false, error: "items must not contain empty strings" };
  }

  const result: ValidBody = { items };

  if (body["retailerIds"] !== undefined) {
    if (!Array.isArray(body["retailerIds"])) {
      return { ok: false, error: "retailerIds must be an array of numbers" };
    }
    result.retailerIds = body["retailerIds"] as number[];
  }

  if (body["memberRetailerIds"] !== undefined) {
    if (!Array.isArray(body["memberRetailerIds"])) {
      return { ok: false, error: "memberRetailerIds must be an array of numbers" };
    }
    result.memberRetailerIds = body["memberRetailerIds"] as number[];
  }

  if (body["region"] !== undefined) {
    if (typeof body["region"] !== "string") {
      return { ok: false, error: "region must be a string" };
    }
    result.region = body["region"];
  }

  return { ok: true, body: result };
}
