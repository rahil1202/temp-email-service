import { NextRequest } from "next/server";
import { getAuthorizedEmail } from "@/lib/server/appwrite-admin";

type RouteContext = {
  params: {
    fileId: string;
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const emailId = request.nextUrl.searchParams.get("emailId");
  const emailAddress = request.nextUrl.searchParams.get("emailAddress");
  const accessToken = request.nextUrl.searchParams.get("accessToken");

  if (!emailId || !emailAddress || !accessToken) {
    return new Response("Missing attachment authorization parameters", { status: 400 });
  }

  const authorized = await getAuthorizedEmail({
    emailId,
    emailAddress,
    accessToken
  });

  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  const attachments = JSON.parse(authorized.email.attachments ?? "[]") as Array<{
    fileId: string;
    filename: string;
    contentType: string;
  }>;
  const attachment = attachments.find((item) => item.fileId === context.params.fileId);

  if (!attachment) {
    return new Response("Attachment not found", { status: 404 });
  }

  const fileBuffer = await authorized.admin.storage.getFileDownload(
    authorized.admin.attachmentsBucketId,
    context.params.fileId
  );

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      "content-type": attachment.contentType || "application/octet-stream",
      "content-disposition": `attachment; filename="${attachment.filename.replace(/"/g, "")}"`
    }
  });
}
