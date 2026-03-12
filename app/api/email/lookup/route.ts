import { NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/client-api";
import { getLookupEmail } from "@/lib/server/appwrite-admin";
import { createLookupRateLimitKey, enforceInMemoryRateLimit, getClientIp, getLookupLimit, isManagedMailbox, isTrustedOrigin } from "@/lib/server/security";
import { parseLookupEmailInput } from "@/lib/server/validation";

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
    const body = parseLookupEmailInput(await request.json());

    if (!isManagedMailbox(body.emailAddress, publicEnv.domains)) {
      return NextResponse.json({ error: "Unsupported inbox domain" }, { status: 400 });
    }

    const result = await getLookupEmail(body.emailAddress, body.emailId);
    if (!result) {
      return NextResponse.json({ error: "Email not found in the last 24 hours" }, { status: 404 });
    }

    return NextResponse.json({
      email: {
        id: result.email.$id,
        emailAddress: result.email.email_address,
        sender: result.email.sender,
        subject: result.email.subject,
        receivedAt: result.email.received_at,
        hasAttachments: JSON.parse(result.email.attachments ?? "[]").length > 0,
        bodyText: result.email.body_text,
        bodyHtml: result.email.body_html,
        attachments: []
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lookup failed" },
      { status: 400 }
    );
  }
}
