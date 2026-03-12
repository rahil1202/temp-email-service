import { createFunctionApi } from "@/lib/api";
import { getPublicEnv } from "@/lib/env";

export const publicEnv = getPublicEnv();

export const functionApi = createFunctionApi({
  createInboxUrl: publicEnv.createInboxUrl,
  getInboxUrl: publicEnv.getInboxUrl,
  getEmailUrl: publicEnv.getEmailUrl,
  deleteInboxUrl: publicEnv.deleteInboxUrl,
  healthUrl: "/api/functions/health",
  lookupInboxUrl: "/api/inbox/lookup",
  lookupEmailUrl: "/api/email/lookup"
});
