import { MAX_API_BODY_BYTES } from "@/shared/constants";
import { DEFAULT_MAIL_DOMAINS } from "@/shared/constants";
import { normalizeEmailAddress, parseManagedEmailAddress } from "@/shared/mailbox";
import type { CreateInboxInput, DeleteInboxInput, GetEmailInput, GetInboxInput } from "@/shared/types";

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,127}$/;
const TOKEN_PATTERN = /^[a-f0-9]{32,128}$/i;

function requireObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid request body");
  }

  return value as Record<string, unknown>;
}

function validateEmailAddress(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Invalid email address");
  }

  const normalized = normalizeEmailAddress(value);

  if (!EMAIL_PATTERN.test(normalized) || normalized.length > 160) {
    throw new Error("Invalid email address");
  }

  return normalized;
}

function validateToken(value: unknown) {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) {
    throw new Error("Invalid access token");
  }

  return value;
}

function validateId(value: unknown, label: string) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new Error(`Invalid ${label}`);
  }

  return value;
}

export function assertBodySize(text: string) {
  if (Buffer.byteLength(text, "utf8") > MAX_API_BODY_BYTES) {
    throw new Error("Request body too large");
  }
}

export function parseCreateInboxInput(body: unknown): CreateInboxInput {
  const data = requireObject(body);
  const preferredDomain = data.preferredDomain;
  const customEmailAddress = data.customEmailAddress;

  if (preferredDomain !== undefined && preferredDomain !== "random" && typeof preferredDomain !== "string") {
    throw new Error("Invalid preferred domain");
  }

  if (customEmailAddress !== undefined) {
    if (typeof customEmailAddress !== "string") {
      throw new Error("Invalid custom email address");
    }

    parseManagedEmailAddress(customEmailAddress, DEFAULT_MAIL_DOMAINS);
  }

  return {
    preferredDomain: preferredDomain as CreateInboxInput["preferredDomain"],
    customEmailAddress: typeof customEmailAddress === "string" ? normalizeEmailAddress(customEmailAddress) : undefined
  };
}

export function parseGetInboxInput(body: unknown): GetInboxInput {
  const data = requireObject(body);
  return {
    emailAddress: validateEmailAddress(data.emailAddress),
    accessToken: validateToken(data.accessToken)
  };
}

export function parseGetEmailInput(body: unknown): GetEmailInput {
  const data = requireObject(body);
  return {
    emailId: validateId(data.emailId, "email id"),
    emailAddress: validateEmailAddress(data.emailAddress),
    accessToken: validateToken(data.accessToken)
  };
}

export function parseDeleteInboxInput(body: unknown): DeleteInboxInput {
  const data = requireObject(body);
  return {
    emailAddress: validateEmailAddress(data.emailAddress),
    accessToken: validateToken(data.accessToken)
  };
}

export function parseLookupInboxInput(body: unknown) {
  const data = requireObject(body);
  return {
    emailAddress: validateEmailAddress(data.emailAddress)
  };
}

export function parseLookupEmailInput(body: unknown) {
  const data = requireObject(body);
  return {
    emailAddress: validateEmailAddress(data.emailAddress),
    emailId: validateId(data.emailId, "email id")
  };
}
