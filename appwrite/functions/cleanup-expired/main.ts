import { createFunctionServices } from "@/appwrite/functions/_shared/appwrite";
import { cleanupExpired } from "@/appwrite/functions/_shared/handlers";
import { failure, json, maybeHandleOptions } from "@/appwrite/functions/_shared/responses";
import type { AppwriteContext } from "@/appwrite/functions/_shared/types";

export default async function main(context: AppwriteContext) {
  const preflight = maybeHandleOptions(context);
  if (preflight) return preflight;

  try {
    const services = createFunctionServices(context.req.headers);
    const result = await cleanupExpired(services);
    return json(context, result);
  } catch (error) {
    context.error(error);
    return failure(context, error instanceof Error ? error.message : "Failed to cleanup inboxes", 500);
  }
}
