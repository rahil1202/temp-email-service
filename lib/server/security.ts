import crypto from "node:crypto";
import { DAILY_CREATE_LIMIT_PER_IP, LOOKUP_WINDOW_HOURS } from "@/shared/constants";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const DAY_MS = 24 * 60 * 60 * 1000;

function getHeader(headers: Headers, key: string) {
  return headers.get(key) ?? headers.get(key.toLowerCase()) ?? "";
}

export function getClientIp(headers: Headers): string {
  const forwarded = getHeader(headers, "x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = getHeader(headers, "x-real-ip");
  return realIp || "unknown";
}

export function fingerprintIp(ip: string) {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export function enforceInMemoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  buckets.set(key, current);
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

export function createDailyCreateRateLimitKey(ip: string) {
  return `create:${fingerprintIp(ip)}`;
}

export function createLookupRateLimitKey(ip: string) {
  return `lookup:${fingerprintIp(ip)}`;
}

export function getDailyCreateLimit() {
  return { limit: DAILY_CREATE_LIMIT_PER_IP, windowMs: DAY_MS };
}

export function getLookupLimit() {
  return { limit: 25, windowMs: DAY_MS };
}

export function isTrustedOrigin(origin: string | null, host: string | null) {
  if (!origin || !host) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

export function isManagedMailbox(emailAddress: string, allowedDomains: readonly string[]) {
  const normalized = emailAddress.trim().toLowerCase();
  const parts = normalized.split("@");
  if (parts.length !== 2) {
    return false;
  }

  return allowedDomains.includes(parts[1] ?? "");
}

export function isWithinLookupWindow(isoDate: string) {
  const cutoff = Date.now() - LOOKUP_WINDOW_HOURS * 60 * 60 * 1000;
  return new Date(isoDate).getTime() >= cutoff;
}
