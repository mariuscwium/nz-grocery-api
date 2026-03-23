import { describe, it, expect } from "vitest";
import { validateSpecialsBody } from "../../src/api/validate.js";

describe("validateSpecialsBody", () => {
  it("accepts valid body", () => {
    const result = validateSpecialsBody({ items: ["milk"] });
    expect(result.ok).toBe(true);
  });

  it("rejects missing items", () => {
    const result = validateSpecialsBody({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("items");
  });

  it("rejects empty items array", () => {
    const result = validateSpecialsBody({ items: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects non-array items", () => {
    const result = validateSpecialsBody({ items: "milk" });
    expect(result.ok).toBe(false);
  });

  it("rejects empty string items", () => {
    const result = validateSpecialsBody({ items: ["milk", "", "bread"] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("empty");
  });

  it("rejects items exceeding max 20", () => {
    const result = validateSpecialsBody({ items: Array.from({ length: 21 }, (_, i) => `item${String(i)}`) });
    expect(result.ok).toBe(false);
  });

  it("accepts optional retailerIds and memberRetailerIds", () => {
    const result = validateSpecialsBody({
      items: ["milk"],
      retailerIds: [1, 2],
      memberRetailerIds: [1],
      region: "Canterbury",
    });
    expect(result.ok).toBe(true);
  });
});
