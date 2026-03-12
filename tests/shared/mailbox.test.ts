import { describe, expect, it } from "vitest";
import { createMailboxIdentity, resolveDomain, withCollisionSuffix } from "@/shared/mailbox";

describe("mailbox helpers", () => {
  it("respects a fixed domain preference", () => {
    expect(resolveDomain("rahil.pro")).toBe("rahil.pro");
  });

  it("creates a lower-cased realistic email address", () => {
    const identity = createMailboxIdentity("pdfwork.space", () => 0.1);

    expect(identity.emailAddress).toMatch(/^[a-z]+\.[a-z]+@pdfwork\.space$/);
    expect(identity.displayName).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it("adds a two-digit collision suffix", () => {
    expect(withCollisionSuffix("aarav.sharma", 23)).toBe("aarav.sharma23");
    expect(withCollisionSuffix("olivia.brown", 3)).toBe("olivia.brown10");
  });
});
