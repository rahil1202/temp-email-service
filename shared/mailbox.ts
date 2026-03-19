import {
  DEFAULT_MAIL_DOMAINS,
  INDIAN_FIRST_NAMES,
  INDIAN_SURNAMES,
  WESTERN_FIRST_NAMES,
  WESTERN_SURNAMES
} from "@/shared/constants";
import type { DomainPreference, MailDomain } from "@/shared/types";

export type GeneratedMailboxIdentity = {
  firstName: string;
  surname: string;
  displayName: string;
  localPartBase: string;
  domain: MailDomain;
  emailAddress: string;
};

type RandomSource = () => number;

const defaultRandom: RandomSource = () => Math.random();
const CUSTOM_LOCAL_PART_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/;

function sample<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)];
}

function pickNamePool(random: RandomSource) {
  return random() >= 0.5
    ? { firstNames: INDIAN_FIRST_NAMES, surnames: INDIAN_SURNAMES }
    : { firstNames: WESTERN_FIRST_NAMES, surnames: WESTERN_SURNAMES };
}

export function resolveDomain(preferredDomain?: DomainPreference, random: RandomSource = defaultRandom): MailDomain {
  return resolveDomainFromList(DEFAULT_MAIL_DOMAINS, preferredDomain, random);
}

export function resolveDomainFromList(
  allowedDomains: readonly MailDomain[],
  preferredDomain?: DomainPreference,
  random: RandomSource = defaultRandom
): MailDomain {
  if (preferredDomain && preferredDomain !== "random") {
    return preferredDomain;
  }

  return sample(allowedDomains, random);
}

export function createMailboxIdentity(
  preferredDomain?: DomainPreference,
  allowedDomains: readonly MailDomain[] = DEFAULT_MAIL_DOMAINS,
  random: RandomSource = defaultRandom
): GeneratedMailboxIdentity {
  const { firstNames, surnames } = pickNamePool(random);
  const firstName = sample(firstNames, random);
  const surname = sample(surnames, random);
  const domain = resolveDomainFromList(allowedDomains, preferredDomain, random);
  const localPartBase = `${firstName}.${surname}`.toLowerCase();

  return {
    firstName,
    surname,
    displayName: `${firstName} ${surname}`,
    localPartBase,
    domain,
    emailAddress: `${localPartBase}@${domain}`
  };
}

export function withCollisionSuffix(localPartBase: string, collisionNumber: number): string {
  const suffix = Math.max(10, collisionNumber).toString().padStart(2, "0");
  return `${localPartBase}${suffix}`;
}

export function normalizeEmailAddress(emailAddress: string): string {
  return emailAddress.trim().toLowerCase();
}

export function isValidCustomLocalPart(localPart: string): boolean {
  return CUSTOM_LOCAL_PART_PATTERN.test(localPart) && !localPart.includes("..");
}

export function parseManagedEmailAddress(
  emailAddress: string,
  allowedDomains: readonly MailDomain[]
): { localPart: string; domain: MailDomain } {
  const normalized = normalizeEmailAddress(emailAddress);
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) {
    throw new Error("Custom email must include a local part and supported domain");
  }

  if (!allowedDomains.includes(domain as MailDomain)) {
    throw new Error("Custom email must use a supported inbox domain");
  }

  if (!isValidCustomLocalPart(localPart)) {
    throw new Error("Custom email local part must be 3-32 chars and use only letters, numbers, dots, hyphens, or underscores");
  }

  return {
    localPart,
    domain: domain as MailDomain
  };
}

export function createCustomMailboxIdentity(
  emailAddress: string,
  allowedDomains: readonly MailDomain[]
): GeneratedMailboxIdentity {
  const { localPart, domain } = parseManagedEmailAddress(emailAddress, allowedDomains);
  const displayName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    firstName: localPart,
    surname: "",
    displayName: displayName || localPart,
    localPartBase: localPart,
    domain,
    emailAddress: `${localPart}@${domain}`
  };
}

export function createRestoreUrl(baseUrl: string, emailAddress: string, accessToken: string): string {
  const url = new URL(`/inbox/${encodeURIComponent(emailAddress)}`, baseUrl);
  url.hash = `token=${encodeURIComponent(accessToken)}`;
  return url.toString();
}
