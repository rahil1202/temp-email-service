import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupExpired, getInbox, receiveEmail } from "@/appwrite/functions/_shared/handlers";
import type { FunctionServices } from "@/appwrite/functions/_shared/appwrite";
import type { ParsedMailgunPayload } from "@/appwrite/functions/_shared/types";

const signingKey = "mailgun-secret";
const tokenPepper = "pepper";
const accessToken = "access-token";
const accessHash = crypto.createHash("sha256").update(`${tokenPepper}:${accessToken}`).digest("hex");

function makeServices(overrides: Partial<FunctionServices> = {}) {
  const base = {
    env: {
      ttlHours: 24,
      mailgunSigningKey: signingKey,
      tokenPepper
    },
    findInboxByEmail: vi.fn(),
    createEmailDocument: vi.fn(),
    uploadAttachment: vi.fn(),
    serializeAttachments: vi.fn((value) => JSON.stringify(value)),
    parseAttachments: vi.fn((value?: string) => (value ? JSON.parse(value) : [])),
    verifyInboxAccess: vi.fn(),
    updateInbox: vi.fn(),
    listInboxEmails: vi.fn(),
    listExpiredInboxes: vi.fn(),
    listInboxEmailsAll: vi.fn(),
    deleteAttachment: vi.fn(),
    deleteEmail: vi.fn(),
    deleteInbox: vi.fn(),
    listEmailsOlderThan: vi.fn()
  } as unknown as FunctionServices;

  return Object.assign(base, overrides);
}

function signedPayload(): ParsedMailgunPayload {
  const timestamp = "1700000000";
  const token = "abc123";
  const signature = crypto.createHmac("sha256", signingKey).update(`${timestamp}${token}`).digest("hex");

  return {
    fields: {
      recipient: ["aarav.sharma@pdfwork.space"],
      sender: ["sender@example.com"],
      subject: ["Subject line"],
      "body-plain": ["Plain text"],
      "body-html": ["<p>Hello</p>"],
      timestamp: [timestamp],
      token: [token],
      signature: [signature]
    },
    files: []
  };
}

describe("function handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores inbound mail for unknown inboxes", async () => {
    const services = makeServices({
      findInboxByEmail: vi.fn().mockResolvedValue(null)
    });

    const result = await receiveEmail(services, signedPayload());

    expect(result.ignored).toBe(true);
    expect(services.createEmailDocument).not.toHaveBeenCalled();
  });

  it("returns newest inbox emails when token is valid", async () => {
    const services = makeServices({
      findInboxByEmail: vi.fn().mockResolvedValue({
        $id: "inbox-1",
        email_address: "aarav.sharma@pdfwork.space",
        access_token_hash: accessHash,
        domain: "pdfwork.space",
        display_name: "Aarav Sharma",
        expires_at: new Date(Date.now() + 60_000).toISOString()
      }),
      verifyInboxAccess: vi.fn().mockReturnValue(true),
      listInboxEmails: vi.fn().mockResolvedValue([
        {
          $id: "email-1",
          email_address: "aarav.sharma@pdfwork.space",
          sender: "sender@example.com",
          subject: "Latest",
          attachments: "[]",
          received_at: new Date().toISOString()
        }
      ])
    });

    const result = await getInbox(services, {
      emailAddress: "aarav.sharma@pdfwork.space",
      accessToken
    });

    expect(result.emails).toHaveLength(1);
    expect(result.session.displayName).toBe("Aarav Sharma");
    expect(services.updateInbox).toHaveBeenCalled();
  });

  it("cascades email and attachment deletion during cleanup", async () => {
    const services = makeServices({
      listExpiredInboxes: vi.fn().mockResolvedValue([
        { $id: "inbox-1", email_address: "aarav.sharma@pdfwork.space" }
      ]),
      listInboxEmailsAll: vi.fn().mockResolvedValue([
        { $id: "email-1", attachments: JSON.stringify([{ fileId: "file-1" }]) }
      ]),
      listEmailsOlderThan: vi.fn().mockResolvedValue([])
    });

    const result = await cleanupExpired(services);

    expect(result.deletedInboxes).toBe(1);
    expect(result.deletedEmails).toBe(1);
    expect(services.deleteAttachment).toHaveBeenCalledWith("file-1");
    expect(services.deleteInbox).toHaveBeenCalledWith("inbox-1");
  });
});
