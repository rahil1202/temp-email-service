import { createFunctionServices } from "@/appwrite/functions/_shared/appwrite";
import { receiveEmail } from "@/appwrite/functions/_shared/handlers";
import { parseInboundPayload } from "@/appwrite/functions/_shared/multipart";
import { failure, json, maybeHandleOptions } from "@/appwrite/functions/_shared/responses";
import type { AppwriteContext } from "@/appwrite/functions/_shared/types";

function measurePayloadSize(context: AppwriteContext) {
  const contentLength = context.req.headers["content-length"] ?? context.req.headers["Content-Length"];

  if (contentLength) {
    return Number(contentLength);
  }

  if (context.req.bodyBinary instanceof Uint8Array) {
    return context.req.bodyBinary.byteLength;
  }

  if (context.req.bodyBinary instanceof ArrayBuffer) {
    return context.req.bodyBinary.byteLength;
  }

  if (typeof context.req.bodyBinary === "string") {
    return Buffer.byteLength(context.req.bodyBinary, "binary");
  }

  return Buffer.byteLength(context.req.bodyText ?? "");
}

export default async function main(context: AppwriteContext) {
  const preflight = maybeHandleOptions(context);
  if (preflight) return preflight;

  try {
    const services = createFunctionServices(context.req.headers);
    const payloadSize = measurePayloadSize(context);

    if (payloadSize > services.env.maxMessageSizeBytes) {
      return failure(context, "Message exceeds 25 MB limit", 413);
    }

    const payload = await parseInboundPayload(context.req);
    const result = await receiveEmail(services, payload);

    if (!result.accepted && result.reason === "invalid_signature") {
      return failure(context, "Invalid Mailgun signature", 406);
    }

    return json(context, result);
  } catch (error) {
    context.error(error);
    return failure(context, error instanceof Error ? error.message : "Failed to process email", 500);
  }
}
