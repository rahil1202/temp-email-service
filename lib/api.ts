import type {
  CreateInboxInput,
  CreateInboxResult,
  DeleteInboxInput,
  DeleteInboxResult,
  FunctionHealthStatus,
  LookupEmailInput,
  LookupInboxInput,
  GetEmailInput,
  GetEmailResult,
  GetInboxInput,
  GetInboxResult
} from "@/shared/types";

async function readResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function postJson<TResponse, TInput>(url: string, body: TInput): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await readResponseText(response);
    throw new Error(`${response.status} ${response.statusText} from ${url}${text ? `\n${text}` : ""}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await readResponseText(response);

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Expected JSON from ${url} but received ${contentType || "unknown content type"}.\n${text.slice(0, 300)}`
    );
  }

  try {
    return JSON.parse(text) as TResponse;
  } catch {
    throw new Error(`Invalid JSON from ${url}.\n${text.slice(0, 300)}`);
  }
}

async function getJson<TResponse>(url: string): Promise<TResponse> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  const text = await readResponseText(response);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}${text ? `\n${text}` : ""}`);
  }

  return JSON.parse(text) as TResponse;
}

export function createFunctionApi(urls: {
  createInboxUrl: string;
  getInboxUrl: string;
  getEmailUrl: string;
  deleteInboxUrl: string;
  healthUrl?: string;
  lookupInboxUrl?: string;
  lookupEmailUrl?: string;
}) {
  return {
    createInbox(input: CreateInboxInput) {
      return postJson<CreateInboxResult, CreateInboxInput>(urls.createInboxUrl, input);
    },
    getInbox(input: GetInboxInput) {
      return postJson<GetInboxResult, GetInboxInput>(urls.getInboxUrl, input);
    },
    getEmail(input: GetEmailInput) {
      return postJson<GetEmailResult, GetEmailInput>(urls.getEmailUrl, input);
    },
    deleteInbox(input: DeleteInboxInput) {
      return postJson<DeleteInboxResult, DeleteInboxInput>(urls.deleteInboxUrl, input);
    },
    getHealth() {
      return getJson<FunctionHealthStatus>(urls.healthUrl ?? "/api/functions/health");
    },
    lookupInbox(input: LookupInboxInput) {
      return postJson<GetInboxResult, LookupInboxInput>(urls.lookupInboxUrl ?? "/api/inbox/lookup", input);
    },
    lookupEmail(input: LookupEmailInput) {
      return postJson<GetEmailResult, LookupEmailInput>(urls.lookupEmailUrl ?? "/api/email/lookup", input);
    }
  };
}
