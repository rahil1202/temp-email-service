import { Client, Databases, ID, Query, Storage, type Models } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import type { AttachmentMeta } from "@/shared/types";
import type { EmailDocument, InboxDocument } from "@/appwrite/functions/_shared/types";
import { getFunctionEnv } from "@/appwrite/functions/_shared/env";
import { isAccessTokenValid } from "@/appwrite/functions/_shared/security";

export type FunctionServices = ReturnType<typeof createFunctionServices>;

function unique<T extends Models.Document>(documents: T[]) {
  return documents[0] ?? null;
}

async function listAllDocuments<T extends Models.Document>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  queries: string[]
) {
  const documents: T[] = [];
  let offset = 0;

  while (true) {
    const page = await databases.listDocuments<T>(databaseId, collectionId, [...queries, Query.limit(100), Query.offset(offset)]);
    documents.push(...page.documents);
    offset += page.documents.length;

    if (documents.length >= page.total || page.documents.length === 0) {
      break;
    }
  }

  return documents;
}

function sortEmailsNewestFirst<T extends { received_at: string }>(documents: T[]) {
  return [...documents].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
}

export function createFunctionServices(
  headers: Record<string, string>,
  logger: (...args: unknown[]) => void = () => undefined
) {
  const env = getFunctionEnv();
  const dynamicKey = headers["x-appwrite-key"] ?? headers["X-Appwrite-Key"] ?? process.env.APPWRITE_API_KEY;

  if (!dynamicKey) {
    throw new Error("Missing Appwrite dynamic API key");
  }

  const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(dynamicKey);

  const databases = new Databases(client);
  const storage = new Storage(client);

  return {
    env,
    log: logger,
    databases,
    storage,
    async findInboxByEmail(emailAddress: string) {
      const result = await databases.listDocuments<InboxDocument>(env.databaseId, env.inboxesCollectionId, [
        Query.equal("email_address", emailAddress),
        Query.limit(1)
      ]);

      return unique(result.documents);
    },
    async createInboxDocument(data: Omit<InboxDocument, keyof Models.Document>) {
      return databases.createDocument<InboxDocument>(env.databaseId, env.inboxesCollectionId, ID.unique(), data);
    },
    async updateInbox(documentId: string, data: Partial<Omit<InboxDocument, keyof Models.Document>>) {
      return databases.updateDocument<InboxDocument>(env.databaseId, env.inboxesCollectionId, documentId, data);
    },
    async deleteInbox(documentId: string) {
      await databases.deleteDocument(env.databaseId, env.inboxesCollectionId, documentId);
    },
    async createEmailDocument(data: Omit<EmailDocument, keyof Models.Document>) {
      return databases.createDocument<EmailDocument>(env.databaseId, env.emailsCollectionId, ID.unique(), data);
    },
    async listInboxEmails(emailAddress: string) {
      try {
        const result = await databases.listDocuments<EmailDocument>(env.databaseId, env.emailsCollectionId, [
          Query.equal("email_address", emailAddress),
          Query.orderDesc("received_at"),
          Query.limit(100)
        ]);
        return result.documents;
      } catch (error) {
        logger("listInboxEmails ordered query failed, using fallback sort", {
          emailAddress,
          error: error instanceof Error ? error.message : String(error)
        });

        const fallback = await databases.listDocuments<EmailDocument>(env.databaseId, env.emailsCollectionId, [
          Query.equal("email_address", emailAddress),
          Query.limit(100)
        ]);

        return sortEmailsNewestFirst(fallback.documents);
      }
    },
    async listInboxEmailsAll(emailAddress: string) {
      try {
        return await listAllDocuments<EmailDocument>(databases, env.databaseId, env.emailsCollectionId, [
          Query.equal("email_address", emailAddress),
          Query.orderDesc("received_at")
        ]);
      } catch (error) {
        logger("listInboxEmailsAll ordered query failed, using fallback sort", {
          emailAddress,
          error: error instanceof Error ? error.message : String(error)
        });

        const fallback = await listAllDocuments<EmailDocument>(databases, env.databaseId, env.emailsCollectionId, [
          Query.equal("email_address", emailAddress)
        ]);

        return sortEmailsNewestFirst(fallback);
      }
    },
    async getEmail(documentId: string) {
      return databases.getDocument<EmailDocument>(env.databaseId, env.emailsCollectionId, documentId);
    },
    async listExpiredInboxes(nowIso: string) {
      return listAllDocuments<InboxDocument>(databases, env.databaseId, env.inboxesCollectionId, [
        Query.lessThanEqual("expires_at", nowIso)
      ]);
    },
    async listEmailsOlderThan(thresholdIso: string) {
      return listAllDocuments<EmailDocument>(databases, env.databaseId, env.emailsCollectionId, [
        Query.lessThanEqual("received_at", thresholdIso)
      ]);
    },
    async deleteEmail(documentId: string) {
      await databases.deleteDocument(env.databaseId, env.emailsCollectionId, documentId);
    },
    async uploadAttachment(attachment: { filename: string; buffer: Buffer; mimeType: string }) {
      const file = await storage.createFile(
        env.attachmentsBucketId,
        ID.unique(),
        InputFile.fromBuffer(attachment.buffer, attachment.filename)
      );

      return {
        fileId: file.$id,
        filename: file.name,
        contentType: attachment.mimeType,
        size: attachment.buffer.length
      } satisfies AttachmentMeta;
    },
    async deleteAttachment(fileId: string) {
      await storage.deleteFile(env.attachmentsBucketId, fileId);
    },
    async downloadAttachment(fileId: string) {
      return storage.getFileDownload(env.attachmentsBucketId, fileId);
    },
    async getAttachment(fileId: string) {
      return storage.getFile(env.attachmentsBucketId, fileId);
    },
    parseAttachments(raw: string | undefined) {
      if (!raw) {
        return [] as AttachmentMeta[];
      }

      try {
        return JSON.parse(raw) as AttachmentMeta[];
      } catch {
        return [] as AttachmentMeta[];
      }
    },
    serializeAttachments(attachments: AttachmentMeta[]) {
      return JSON.stringify(attachments);
    },
    verifyInboxAccess(inbox: InboxDocument | null, accessToken: string) {
      return Boolean(inbox && isAccessTokenValid(accessToken, inbox.access_token_hash, env.tokenPepper));
    }
  };
}
