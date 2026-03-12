import { DEFAULT_MAIL_DOMAINS, INBOX_TTL_HOURS, MAX_MESSAGE_SIZE_BYTES } from "@/shared/constants";
import type { MailDomain } from "@/shared/types";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }

  return value;
}

export type FunctionEnv = {
  endpoint: string;
  projectId: string;
  databaseId: string;
  emailsCollectionId: string;
  inboxesCollectionId: string;
  attachmentsBucketId: string;
  tokenPepper: string;
  mailgunSigningKey: string;
  publicAppUrl: string;
  ttlHours: number;
  maxMessageSizeBytes: number;
  domains: MailDomain[];
};

export function getFunctionEnv(): FunctionEnv {
  return {
    endpoint: requireEnv("APPWRITE_API_ENDPOINT"),
    projectId: requireEnv("APPWRITE_PROJECT_ID"),
    databaseId: requireEnv("APPWRITE_DATABASE_ID"),
    emailsCollectionId: requireEnv("APPWRITE_EMAILS_COLLECTION_ID"),
    inboxesCollectionId: requireEnv("APPWRITE_INBOXES_COLLECTION_ID"),
    attachmentsBucketId: requireEnv("APPWRITE_ATTACHMENTS_BUCKET_ID"),
    tokenPepper: process.env.ACCESS_TOKEN_PEPPER ?? "",
    mailgunSigningKey: process.env.MAILGUN_SIGNING_KEY ?? "",
    publicAppUrl: requireEnv("NEXT_PUBLIC_RESTORE_BASE_URL"),
    ttlHours: Number(process.env.MAIL_INBOX_TTL_HOURS ?? INBOX_TTL_HOURS),
    maxMessageSizeBytes: Number(process.env.MAIL_MAX_SIZE_BYTES ?? MAX_MESSAGE_SIZE_BYTES),
    domains: (process.env.MAIL_DOMAINS?.split(",").map((value) => value.trim()).filter(Boolean) ??
      [...DEFAULT_MAIL_DOMAINS]) as MailDomain[]
  };
}
