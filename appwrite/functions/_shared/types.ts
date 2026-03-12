import type { Models } from "node-appwrite";
import type { AttachmentMeta } from "@/shared/types";

export type AppwriteRequest = {
  method: string;
  path?: string;
  headers: Record<string, string>;
  bodyText?: string;
  bodyJson?: unknown;
  bodyBinary?: string | Uint8Array | ArrayBuffer;
};

export type AppwriteResponse = {
  json: (body: unknown, statusCode?: number, headers?: Record<string, string>) => unknown;
  text: (body: string, statusCode?: number, headers?: Record<string, string>) => unknown;
};

export type AppwriteContext = {
  req: AppwriteRequest;
  res: AppwriteResponse;
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type InboxDocument = Models.Document & {
  email_address: string;
  access_token_hash: string;
  domain: string;
  display_name: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
};

export type EmailDocument = Models.Document & {
  email_address: string;
  sender: string;
  subject: string;
  body_text: string;
  body_html: string;
  attachments: string;
  received_at: string;
};

export type ParsedInboundFile = {
  fieldName: string;
  filename: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
};

export type ParsedMailgunPayload = {
  fields: Record<string, string[]>;
  files: ParsedInboundFile[];
};

export type NormalizedInboundMessage = {
  recipient: string;
  sender: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: string;
  attachments: AttachmentMeta[];
};
