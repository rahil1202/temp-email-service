import { NextResponse } from "next/server";

const FUNCTION_IDS = ["create-inbox", "get-inbox", "get-email", "delete-inbox", "receive-email"];

export async function GET() {
  const apiEndpoint = process.env.APPWRITE_API_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  const response = {
    createInboxUrl: process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_CREATE_INBOX_URL ?? "",
    getInboxUrl: process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_GET_INBOX_URL ?? "",
    getEmailUrl: process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_GET_EMAIL_URL ?? "",
    deleteInboxUrl: process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_DELETE_INBOX_URL ?? "",
    receiveEmailUrl: process.env.APPWRITE_FUNCTION_RECEIVE_EMAIL_URL ?? "",
    apiEndpointConfigured: Boolean(apiEndpoint),
    projectConfigured: Boolean(projectId),
    apiKeyConfigured: Boolean(apiKey),
    functionStatuses: [] as Array<{
      id: string;
      enabled: boolean;
      live: boolean;
      deploymentStatus: string | null;
    }>
  };

  if (!apiEndpoint || !projectId || !apiKey) {
    return NextResponse.json(response, { status: 200 });
  }

  const functionStatuses = await Promise.all(
    FUNCTION_IDS.map(async (id) => {
      try {
        const functionResponse = await fetch(`${apiEndpoint}/functions/${id}`, {
          headers: {
            "x-appwrite-project": projectId,
            "x-appwrite-key": apiKey
          },
          cache: "no-store"
        });

        if (!functionResponse.ok) {
          return { id, enabled: false, live: false, deploymentStatus: `http_${functionResponse.status}` };
        }

        const data = await functionResponse.json();
        return {
          id,
          enabled: Boolean(data.enabled),
          live: Boolean(data.live),
          deploymentStatus: data.latestDeploymentStatus ?? null
        };
      } catch {
        return { id, enabled: false, live: false, deploymentStatus: "unreachable" };
      }
    })
  );

  response.functionStatuses = functionStatuses;
  return NextResponse.json(response, { status: 200 });
}
