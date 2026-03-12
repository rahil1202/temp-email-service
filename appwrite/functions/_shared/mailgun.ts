import crypto from "node:crypto";
import { sanitizeEmailHtml } from "@/appwrite/functions/_shared/sanitize";
import type { ParsedMailgunPayload } from "@/appwrite/functions/_shared/types";
import { normalizeEmailAddress } from "@/shared/mailbox";

function getField(payload: ParsedMailgunPayload, name: string) {
  return payload.fields[name]?.find(Boolean) ?? "";
}

function getMultiField(payload: ParsedMailgunPayload, name: string) {
  return payload.fields[name]?.filter(Boolean) ?? [];
}

export function verifyMailgunSignature(payload: ParsedMailgunPayload, signingKey: string) {
  if (!signingKey) {
    return false;
  }

  const timestamp = getField(payload, "timestamp");
  const token = getField(payload, "token");
  const signature = getField(payload, "signature");

  if (!timestamp || !token || !signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", signingKey).update(`${timestamp}${token}`).digest("hex");
  const actualBuffer = Buffer.from(digest, "hex");
  const expectedBuffer = Buffer.from(signature, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function normalizeInboundContent(payload: ParsedMailgunPayload) {
  const recipient = normalizeEmailAddress(getField(payload, "recipient"));
  const sender = getField(payload, "sender") || getField(payload, "from");
  const subject = getField(payload, "subject") || "(No subject)";
  const plainSegments = getMultiField(payload, "body-plain");
  const htmlSegments = getMultiField(payload, "body-html");
  const fallbackHtml = plainSegments.length
    ? `<pre>${plainSegments.join("\n\n").replace(/[<&>]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[char] ?? char))}</pre>`
    : "";

  return {
    recipient,
    sender,
    subject,
    bodyText: plainSegments.join("\n\n"),
    bodyHtml: sanitizeEmailHtml(htmlSegments.join("\n\n") || fallbackHtml),
    receivedAt: new Date().toISOString()
  };
}
