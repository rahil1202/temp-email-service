import type { AppwriteContext } from "@/appwrite/functions/_shared/types";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "content-type": "application/json; charset=utf-8"
};

export function maybeHandleOptions(context: AppwriteContext) {
  if (context.req.method?.toUpperCase() === "OPTIONS") {
    return context.res.text("", 204, CORS_HEADERS);
  }

  return null;
}

export function json(context: AppwriteContext, body: unknown, statusCode = 200) {
  return context.res.json(body, statusCode, CORS_HEADERS);
}

export function failure(context: AppwriteContext, message: string, statusCode = 400) {
  return json(context, { error: message }, statusCode);
}
