import { NextRequest, NextResponse } from "next/server";
import { DAILY_CREATE_LIMIT_PER_IP, MAX_API_BODY_BYTES } from "@/shared/constants";
import {
  createDailyCreateRateLimitKey,
  enforceInMemoryRateLimit,
  getClientIp,
  isTrustedOrigin
} from "@/lib/server/security";
import {
  assertBodySize,
  parseCreateInboxInput,
  parseDeleteInboxInput,
  parseGetEmailInput,
  parseGetInboxInput
} from "@/lib/server/validation";

const ALLOWED_FUNCTIONS = new Set(["create-inbox", "get-inbox", "get-email", "delete-inbox"]);

type RouteContext = {
  params: Promise<{ fn: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { fn } = await context.params;

  if (!ALLOWED_FUNCTIONS.has(fn)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isTrustedOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const apiEndpoint = process.env.APPWRITE_API_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!apiEndpoint || !projectId || !apiKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_API_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  try {
    assertBodySize(body);
    const parsed = body ? JSON.parse(body) : {};

    if (fn === "create-inbox") {
      const ip = getClientIp(request.headers);
      const rate = enforceInMemoryRateLimit(
        createDailyCreateRateLimitKey(ip),
        DAILY_CREATE_LIMIT_PER_IP,
        24 * 60 * 60 * 1000
      );

      if (!rate.allowed) {
        return NextResponse.json({ error: "Daily create limit reached for this IP" }, { status: 429 });
      }

      parseCreateInboxInput(parsed);
    } else if (fn === "get-inbox") {
      parseGetInboxInput(parsed);
    } else if (fn === "get-email") {
      parseGetEmailInput(parsed);
    } else if (fn === "delete-inbox") {
      parseDeleteInboxInput(parsed);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }

  const execResponse = await fetch(`${apiEndpoint}/functions/${fn}/executions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-appwrite-project": projectId,
      "x-appwrite-key": apiKey
    },
    body: JSON.stringify({
      async: false,
      method: "POST",
      body
    }),
    cache: "no-store"
  });

  if (!execResponse.ok) {
    const text = await execResponse.text();
    return NextResponse.json({ error: text }, { status: execResponse.status });
  }

  const execution = await execResponse.json();

  const status = execution.responseStatusCode ?? 500;
  const responseBody = execution.responseBody ?? "";

  if (fn === "get-inbox") {
    try {
      const parsedBody = body ? JSON.parse(body) : {};
      console.info("get-inbox proxy execution", {
        emailAddress: parsedBody.emailAddress,
        responseStatusCode: status,
        responseBodyPreview: typeof responseBody === "string" ? responseBody.slice(0, 300) : ""
      });
    } catch {
      console.info("get-inbox proxy execution", {
        responseStatusCode: status,
        responseBodyPreview: typeof responseBody === "string" ? responseBody.slice(0, 300) : ""
      });
    }
  }

  return new NextResponse(responseBody, {
    status,
    headers: { "content-type": "application/json" }
  });
}
