import type {
  CreateInboxInput,
  CreateInboxResult,
  DeleteInboxInput,
  DeleteInboxResult,
  GetEmailInput,
  GetEmailResult,
  GetInboxInput,
  GetInboxResult
} from "@/shared/types";

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
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export function createFunctionApi(urls: {
  createInboxUrl: string;
  getInboxUrl: string;
  getEmailUrl: string;
  deleteInboxUrl: string;
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
    }
  };
}
