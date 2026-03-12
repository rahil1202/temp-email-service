import { createFunctionServices } from "@/appwrite/functions/_shared/appwrite";
import { createInbox } from "@/appwrite/functions/_shared/handlers";
import { failure, json, maybeHandleOptions } from "@/appwrite/functions/_shared/responses";
import type { AppwriteContext } from "@/appwrite/functions/_shared/types";
import type { CreateInboxInput } from "@/shared/types";

export default async function main(context: AppwriteContext) {
  const preflight = maybeHandleOptions(context);
  if (preflight) return preflight;

  try {
    const services = createFunctionServices(context.req.headers);
    const body = (context.req.bodyJson ?? {}) as CreateInboxInput;
    const result = await createInbox(services, body);
    return json(context, result);
  } catch (error) {
    context.error(error);
    return failure(context, error instanceof Error ? error.message : "Failed to create inbox", 500);
  }
}
