import { NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/client-api";
import { listLookupInboxEmails } from "@/lib/server/appwrite-admin";
import {
  createLookupRateLimitKey,
  enforceInMemoryRateLimit,
  getClientIp,
  getLookupLimit,
  isManagedMailbox,
  isTrustedOrigin
} from "@/lib/server/security";
import { parseLookupInboxInput } from "@/lib/server/validation";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const ip = getClientIp(request.headers);
  const { limit, windowMs } = getLookupLimit();
  const rate = enforceInMemoryRateLimit(createLookupRateLimitKey(ip), limit, windowMs);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Lookup limit reached for today" }, { status: 429 });
  }

  try {
    const body = parseLookupInboxInput(await request.json());

    if (!isManagedMailbox(body.emailAddress, publicEnv.domains)) {
      return NextResponse.json({ error: "Unsupported inbox domain" }, { status: 400 });
    }

    const result = await listLookupInboxEmails(body.emailAddress);
    if (!result) {
      return NextResponse.json({ error: "Inbox not found in the last 24 hours" }, { status: 404 });
    }

    return NextResponse.json({
      session: {
        emailAddress: result.inbox.email_address,
        domain: result.inbox.domain,
        expiresAt: result.inbox.expires_at,
        displayName: result.inbox.display_name
      },
      emails: result.emails.map((email) => ({
        id: email.$id,
        emailAddress: email.email_address,
        sender: email.sender,
        subject: email.subject,
        receivedAt: email.received_at,
        hasAttachments: JSON.parse(email.attachments ?? "[]").length > 0
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lookup failed" },
      { status: 400 }
    );
  }
}
