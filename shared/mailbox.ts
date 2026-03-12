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

function sample<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)];
}

function pickNamePool(random: RandomSource) {
  return random() >= 0.5
    ? { firstNames: INDIAN_FIRST_NAMES, surnames: INDIAN_SURNAMES }
    : { firstNames: WESTERN_FIRST_NAMES, surnames: WESTERN_SURNAMES };
}

export function resolveDomain(preferredDomain?: DomainPreference, random: RandomSource = defaultRandom): MailDomain {
  if (preferredDomain && preferredDomain !== "random") {
    return preferredDomain;
  }

  return sample(DEFAULT_MAIL_DOMAINS, random);
}

export function createMailboxIdentity(
  preferredDomain?: DomainPreference,
  random: RandomSource = defaultRandom
): GeneratedMailboxIdentity {
  const { firstNames, surnames } = pickNamePool(random);
  const firstName = sample(firstNames, random);
  const surname = sample(surnames, random);
  const domain = resolveDomain(preferredDomain, random);
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

export function createRestoreUrl(baseUrl: string, emailAddress: string, accessToken: string): string {
  const url = new URL(`/inbox/${encodeURIComponent(emailAddress)}`, baseUrl);
  url.hash = `token=${encodeURIComponent(accessToken)}`;
  return url.toString();
}
