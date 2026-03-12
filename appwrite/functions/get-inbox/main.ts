import { createFunctionServices } from "@/appwrite/functions/_shared/appwrite";
import { getInbox } from "@/appwrite/functions/_shared/handlers";
import { failure, json, maybeHandleOptions } from "@/appwrite/functions/_shared/responses";
import type { AppwriteContext } from "@/appwrite/functions/_shared/types";
import { parseGetInboxInput } from "@/lib/server/validation";

export default async function main(context: AppwriteContext) {
  const preflight = maybeHandleOptions(context);
  if (preflight) return preflight;

  try {
    const services = createFunctionServices(context.req.headers);
    const body = parseGetInboxInput(context.req.bodyJson ?? {});
    const result = await getInbox(services, body);
    return json(context, result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message === "Inbox access denied" ? 401 : 500;
    context.error(error);
    return failure(context, error instanceof Error ? error.message : "Failed to fetch inbox", statusCode);
  }
}
