import crypto from "node:crypto";

export function generateAccessToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function hashAccessToken(token: string, pepper: string) {
  return crypto.createHash("sha256").update(`${pepper}:${token}`).digest("hex");
}

export function isAccessTokenValid(token: string, expectedHash: string, pepper: string) {
  const actualBuffer = Buffer.from(hashAccessToken(token, pepper), "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
