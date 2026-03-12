import { DEFAULT_MAIL_DOMAINS, POLL_INTERVAL_MS } from "@/shared/constants";
import type { MailDomain } from "@/shared/types";

type PublicEnv = {
  createInboxUrl: string;
  getInboxUrl: string;
  getEmailUrl: string;
  deleteInboxUrl: string;
  pollIntervalMs: number;
  restoreBaseUrl: string;
  domains: MailDomain[];
};

function requireValue(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function parseDomains(raw: string | undefined): MailDomain[] {
  const parsed = raw?.split(",").map((value) => value.trim()).filter(Boolean) as MailDomain[] | undefined;
  return parsed?.length ? parsed : [...DEFAULT_MAIL_DOMAINS];
}

export function getPublicEnv(): PublicEnv {
  return {
    createInboxUrl: requireValue("NEXT_PUBLIC_APPWRITE_FUNCTION_CREATE_INBOX_URL", "/api/functions/create-inbox"),
    getInboxUrl: requireValue("NEXT_PUBLIC_APPWRITE_FUNCTION_GET_INBOX_URL", "/api/functions/get-inbox"),
    getEmailUrl: requireValue("NEXT_PUBLIC_APPWRITE_FUNCTION_GET_EMAIL_URL", "/api/functions/get-email"),
    deleteInboxUrl: requireValue("NEXT_PUBLIC_APPWRITE_FUNCTION_DELETE_INBOX_URL", "/api/functions/delete-inbox"),
    pollIntervalMs: Number(process.env.NEXT_PUBLIC_INBOX_POLL_MS ?? POLL_INTERVAL_MS),
    restoreBaseUrl: requireValue("NEXT_PUBLIC_RESTORE_BASE_URL", "http://localhost:3000"),
    domains: parseDomains(process.env.NEXT_PUBLIC_MAIL_DOMAINS)
  };
}
