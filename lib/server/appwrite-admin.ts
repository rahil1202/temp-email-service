import { Client, Databases, Query, Storage } from "node-appwrite";
import { isAccessTokenValid } from "@/appwrite/functions/_shared/security";
import type { EmailDocument, InboxDocument } from "@/appwrite/functions/_shared/types";

function requireValue(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }

  return value;
}

export function createAdminAppwrite() {
  const endpoint = requireValue("APPWRITE_API_ENDPOINT");
  const projectId = requireValue("APPWRITE_PROJECT_ID");
  const apiKey = requireValue("APPWRITE_API_KEY");
  const databaseId = requireValue("APPWRITE_DATABASE_ID");
  const emailsCollectionId = requireValue("APPWRITE_EMAILS_COLLECTION_ID");
  const inboxesCollectionId = requireValue("APPWRITE_INBOXES_COLLECTION_ID");
  const attachmentsBucketId = requireValue("APPWRITE_ATTACHMENTS_BUCKET_ID");
  const tokenPepper = process.env.ACCESS_TOKEN_PEPPER ?? "";
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

  return {
    databaseId,
    emailsCollectionId,
    inboxesCollectionId,
    attachmentsBucketId,
    tokenPepper,
    databases: new Databases(client),
    storage: new Storage(client)
  };
}

export async function verifyInboxOwnership({
  emailAddress,
  accessToken
}: {
  emailAddress: string;
  accessToken: string;
}) {
  const admin = createAdminAppwrite();
  const inboxes = await admin.databases.listDocuments<InboxDocument>(admin.databaseId, admin.inboxesCollectionId, [
    Query.equal("email_address", emailAddress),
    Query.limit(1)
  ]);
  const inbox = inboxes.documents[0];

  if (!inbox) {
    return null;
  }

  if (new Date(inbox.expires_at).getTime() <= Date.now()) {
    return null;
  }

  if (!isAccessTokenValid(accessToken, inbox.access_token_hash, admin.tokenPepper)) {
    return null;
  }

  return { admin, inbox };
}

export async function getAuthorizedEmail({
  emailId,
  emailAddress,
  accessToken
}: {
  emailId: string;
  emailAddress: string;
  accessToken: string;
}) {
  const ownership = await verifyInboxOwnership({ emailAddress, accessToken });

  if (!ownership) {
    return null;
  }

  const email = await ownership.admin.databases.getDocument<EmailDocument>(
    ownership.admin.databaseId,
    ownership.admin.emailsCollectionId,
    emailId
  );

  if (email.email_address !== emailAddress) {
    return null;
  }

  return { ...ownership, email };
}
