import { Client, Databases, Query, Storage } from "node-appwrite";
import { isAccessTokenValid } from "@/appwrite/functions/_shared/security";
import type { EmailDocument, InboxDocument } from "@/appwrite/functions/_shared/types";
import { LOOKUP_WINDOW_HOURS } from "@/shared/constants";

function requireValue(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }

  return value;
}

function sortEmailsNewestFirst<T extends { received_at: string }>(documents: T[]) {
  return [...documents].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
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

export async function getLookupInbox(emailAddress: string) {
  const admin = createAdminAppwrite();
  const now = Date.now();
  const cutoffIso = new Date(now - LOOKUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const inboxes = await admin.databases.listDocuments<InboxDocument>(admin.databaseId, admin.inboxesCollectionId, [
    Query.equal("email_address", emailAddress),
    Query.greaterThanEqual("expires_at", cutoffIso),
    Query.limit(1)
  ]);

  return { admin, inbox: inboxes.documents[0] ?? null };
}

export async function listLookupInboxEmails(emailAddress: string) {
  const { admin, inbox } = await getLookupInbox(emailAddress);
  if (!inbox) {
    return null;
  }

  const cutoffIso = new Date(Date.now() - LOOKUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  let emails;

  try {
    emails = await admin.databases.listDocuments<EmailDocument>(admin.databaseId, admin.emailsCollectionId, [
      Query.equal("email_address", emailAddress),
      Query.greaterThanEqual("received_at", cutoffIso),
      Query.orderDesc("received_at"),
      Query.limit(100)
    ]);
  } catch {
    const fallback = await admin.databases.listDocuments<EmailDocument>(admin.databaseId, admin.emailsCollectionId, [
      Query.equal("email_address", emailAddress),
      Query.greaterThanEqual("received_at", cutoffIso),
      Query.limit(100)
    ]);

    emails = {
      ...fallback,
      documents: sortEmailsNewestFirst(fallback.documents)
    };
  }

  return { admin, inbox, emails: emails.documents };
}

export async function getLookupEmail(emailAddress: string, emailId: string) {
  const listed = await listLookupInboxEmails(emailAddress);
  if (!listed) {
    return null;
  }

  const email = listed.emails.find((item) => item.$id === emailId);
  if (!email) {
    return null;
  }

  return { ...listed, email };
}
