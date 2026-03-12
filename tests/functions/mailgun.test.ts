import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeInboundContent, verifyMailgunSignature } from "@/appwrite/functions/_shared/mailgun";
import type { ParsedMailgunPayload } from "@/appwrite/functions/_shared/types";

function buildPayload(overrides?: Partial<ParsedMailgunPayload>): ParsedMailgunPayload {
  return {
    fields: {
      recipient: ["Aarav.Sharma@pdfwork.space"],
      sender: ["hello@example.com"],
      subject: ["Welcome"],
      "body-plain": ["Plain body"],
      "body-html": ['<div>Safe <script>alert("x")</script> body</div>'],
      timestamp: ["1700000000"],
      token: ["abc123"],
      signature: [""]
    },
    files: [],
    ...overrides
  };
}

describe("mailgun helpers", () => {
  it("validates a correct Mailgun signature", () => {
    const signingKey = "test-signing-key";
    const payload = buildPayload();
    payload.fields.signature = [
      crypto.createHmac("sha256", signingKey).update("1700000000abc123").digest("hex")
    ];

    expect(verifyMailgunSignature(payload, signingKey)).toBe(true);
    expect(verifyMailgunSignature(payload, "wrong-key")).toBe(false);
  });

  it("normalizes recipient casing and strips unsafe HTML", () => {
    const normalized = normalizeInboundContent(buildPayload());

    expect(normalized.recipient).toBe("aarav.sharma@pdfwork.space");
    expect(normalized.bodyHtml).toContain("Safe");
    expect(normalized.bodyHtml).not.toContain("<script>");
  });
});
