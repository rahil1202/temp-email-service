import { createFunctionServices } from "@/appwrite/functions/_shared/appwrite";
import { getEmail } from "@/appwrite/functions/_shared/handlers";
import { failure, json, maybeHandleOptions } from "@/appwrite/functions/_shared/responses";
import type { AppwriteContext } from "@/appwrite/functions/_shared/types";
import type { GetEmailInput } from "@/shared/types";

export default async function main(context: AppwriteContext) {
  const preflight = maybeHandleOptions(context);
  if (preflight) return preflight;

  try {
    const services = createFunctionServices(context.req.headers);
    const body = (context.req.bodyJson ?? {}) as GetEmailInput;
    const result = await getEmail(services, body);
    return json(context, result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message === "Inbox access denied" ? 401 : 500;
    context.error(error);
    return failure(context, error instanceof Error ? error.message : "Failed to fetch email", statusCode);
  }
}
