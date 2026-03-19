import {
  createCustomMailboxIdentity,
  createMailboxIdentity,
  createRestoreUrl,
  normalizeEmailAddress,
  withCollisionSuffix
} from "@/shared/mailbox";
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
import type { FunctionServices } from "@/appwrite/functions/_shared/appwrite";
import { normalizeInboundContent, verifyMailgunSignature } from "@/appwrite/functions/_shared/mailgun";
import type { ParsedMailgunPayload } from "@/appwrite/functions/_shared/types";
import { generateAccessToken, hashAccessToken } from "@/appwrite/functions/_shared/security";

function nowPlusHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function isExpired(isoDate: string) {
  return new Date(isoDate).getTime() <= Date.now();
}

async function removeEmailWithAttachments(
  services: FunctionServices,
  email: { $id: string; attachments: string }
) {
  const attachments = services.parseAttachments(email.attachments);

  for (const attachment of attachments) {
    try {
      await services.deleteAttachment(attachment.fileId);
    } catch {
      // Ignore already-deleted files during cleanup retries.
    }
  }

  await services.deleteEmail(email.$id);
}

export async function createInbox(
  services: FunctionServices,
  input: CreateInboxInput | undefined
): Promise<CreateInboxResult> {
  const preferredDomain = input?.preferredDomain;
  const customEmailAddress = input?.customEmailAddress;
  const expiresAt = nowPlusHours(services.env.ttlHours);
  const createdAt = new Date().toISOString();

  if (customEmailAddress) {
    const identity = createCustomMailboxIdentity(customEmailAddress, services.env.domains);
    const existingInbox = await services.findInboxByEmail(identity.emailAddress);

    if (existingInbox) {
      throw new Error("That email address is already reserved. Try another one.");
    }

    const accessToken = generateAccessToken();
    await services.createInboxDocument({
      email_address: identity.emailAddress,
      access_token_hash: hashAccessToken(accessToken, services.env.tokenPepper),
      domain: identity.domain,
      display_name: identity.displayName,
      created_at: createdAt,
      expires_at: expiresAt,
      last_seen_at: createdAt
    });

    return {
      emailAddress: identity.emailAddress,
      accessToken,
      expiresAt,
      domain: identity.domain,
      restoreUrl: createRestoreUrl(services.env.publicAppUrl, identity.emailAddress, accessToken),
      displayName: identity.displayName
    };
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const identity = createMailboxIdentity(preferredDomain, services.env.domains);
    const localPart = attempt === 0 ? identity.localPartBase : withCollisionSuffix(identity.localPartBase, 10 + attempt);
    const emailAddress = `${localPart}@${identity.domain}`;
    const existingInbox = await services.findInboxByEmail(emailAddress);

    if (existingInbox) {
      continue;
    }

    const accessToken = generateAccessToken();
    await services.createInboxDocument({
      email_address: emailAddress,
      access_token_hash: hashAccessToken(accessToken, services.env.tokenPepper),
      domain: identity.domain,
      display_name: identity.displayName,
      created_at: createdAt,
      expires_at: expiresAt,
      last_seen_at: createdAt
    });

    return {
      emailAddress,
      accessToken,
      expiresAt,
      domain: identity.domain,
      restoreUrl: createRestoreUrl(services.env.publicAppUrl, emailAddress, accessToken),
      displayName: identity.displayName
    };
  }

  throw new Error("Unable to reserve an inbox address");
}

export async function getInbox(
  services: FunctionServices,
  input: GetInboxInput
): Promise<GetInboxResult> {
  const emailAddress = normalizeEmailAddress(input.emailAddress);
  services.log("get-inbox requested", { emailAddress });
  const inbox = await services.findInboxByEmail(emailAddress);
  const accessValid = services.verifyInboxAccess(inbox, input.accessToken);
  const expired = inbox ? isExpired(inbox.expires_at) : false;

  services.log("get-inbox resolved inbox", {
    emailAddress,
    inboxFound: Boolean(inbox),
    tokenValid: accessValid,
    expired
  });

  if (!accessValid || !inbox || expired) {
    throw new Error("Inbox access denied");
  }

  await services.updateInbox(inbox.$id, { last_seen_at: new Date().toISOString() });
  const emails = await services.listInboxEmails(emailAddress);
  services.log("get-inbox returning emails", {
    emailAddress,
    emailCount: emails.length
  });

  return {
    session: {
      emailAddress,
      domain: inbox.domain as GetInboxResult["session"]["domain"],
      expiresAt: inbox.expires_at,
      displayName: inbox.display_name
    },
    emails: emails.map((email) => ({
      id: email.$id,
      emailAddress: email.email_address,
      sender: email.sender,
      subject: email.subject,
      receivedAt: email.received_at,
      hasAttachments: services.parseAttachments(email.attachments).length > 0
    }))
  };
}

export async function getEmail(
  services: FunctionServices,
  input: GetEmailInput
): Promise<GetEmailResult> {
  const emailAddress = normalizeEmailAddress(input.emailAddress);
  const inbox = await services.findInboxByEmail(emailAddress);

  if (!services.verifyInboxAccess(inbox, input.accessToken) || !inbox || isExpired(inbox.expires_at)) {
    throw new Error("Inbox access denied");
  }

  const email = await services.getEmail(input.emailId);

  if (email.email_address !== emailAddress) {
    throw new Error("Email not found for inbox");
  }

  await services.updateInbox(inbox.$id, { last_seen_at: new Date().toISOString() });

  return {
    email: {
      id: email.$id,
      emailAddress: email.email_address,
      sender: email.sender,
      subject: email.subject,
      receivedAt: email.received_at,
      hasAttachments: services.parseAttachments(email.attachments).length > 0,
      bodyText: email.body_text,
      bodyHtml: email.body_html,
      attachments: services.parseAttachments(email.attachments)
    }
  };
}

export async function deleteInbox(
  services: FunctionServices,
  input: DeleteInboxInput
): Promise<DeleteInboxResult> {
  const emailAddress = normalizeEmailAddress(input.emailAddress);
  const inbox = await services.findInboxByEmail(emailAddress);

  if (!services.verifyInboxAccess(inbox, input.accessToken) || !inbox) {
    throw new Error("Inbox access denied");
  }

  const emails = await services.listInboxEmailsAll(emailAddress);

  for (const email of emails) {
    await removeEmailWithAttachments(services, email);
  }

  await services.deleteInbox(inbox.$id);

  return { deleted: true };
}

export async function receiveEmail(
  services: FunctionServices,
  payload: ParsedMailgunPayload
) {
  if (!verifyMailgunSignature(payload, services.env.mailgunSigningKey)) {
    services.log("receive-email rejected", {
      method: "POST",
      reason: "invalid_signature"
    });
    return { accepted: false, ignored: false, reason: "invalid_signature" as const };
  }

  services.log("receive-email payload parsed", {
    method: "POST"
  });
  const normalized = normalizeInboundContent(payload);
  services.log("receive-email normalized recipient", {
    recipient: normalized.recipient
  });
  const inbox = await services.findInboxByEmail(normalized.recipient);
  services.log("receive-email inbox lookup", {
    recipient: normalized.recipient,
    inboxFound: Boolean(inbox),
    expired: inbox ? isExpired(inbox.expires_at) : false
  });

  if (!inbox || isExpired(inbox.expires_at)) {
    services.log("receive-email completed", {
      recipient: normalized.recipient,
      reason: "unknown_or_expired_inbox"
    });
    return { accepted: true, ignored: true, reason: "unknown_or_expired_inbox" as const };
  }

  const attachments = [];

  for (const file of payload.files.filter((entry) => entry.fieldName.startsWith("attachment"))) {
    const uploaded = await services.uploadAttachment({
      filename: file.filename,
      buffer: file.buffer,
      mimeType: file.mimeType
    });
    attachments.push(uploaded);
  }

  const storedEmail = await services.createEmailDocument({
    email_address: normalized.recipient,
    sender: normalized.sender,
    subject: normalized.subject,
    body_text: normalized.bodyText,
    body_html: normalized.bodyHtml,
    attachments: services.serializeAttachments(attachments),
    received_at: normalized.receivedAt
  });

  services.log("receive-email stored document", {
    recipient: normalized.recipient,
    emailId: storedEmail.$id
  });
  services.log("receive-email completed", {
    recipient: normalized.recipient,
    reason: "stored"
  });

  return { accepted: true, ignored: false, reason: "stored" as const };
}

export async function cleanupExpired(services: FunctionServices) {
  const expiredThreshold = new Date(Date.now() - services.env.ttlHours * 60 * 60 * 1000).toISOString();
  const expiredInboxes = await services.listExpiredInboxes(new Date().toISOString());
  let deletedInboxes = 0;
  let deletedEmails = 0;

  for (const inbox of expiredInboxes) {
    const emails = await services.listInboxEmailsAll(inbox.email_address);

    for (const email of emails) {
      await removeEmailWithAttachments(services, email);
      deletedEmails += 1;
    }

    await services.deleteInbox(inbox.$id);
    deletedInboxes += 1;
  }

  const orphanedEmails = await services.listEmailsOlderThan(expiredThreshold);

  for (const email of orphanedEmails) {
    try {
      await removeEmailWithAttachments(services, email);
      deletedEmails += 1;
    } catch {
      // Ignore races where inbox cleanup already removed the same email.
    }
  }

  return {
    deletedInboxes,
    deletedEmails
  };
}
