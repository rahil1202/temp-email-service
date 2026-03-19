export type MailDomain = string;

export type DomainPreference = MailDomain | "random";

export type InboxSession = {
  emailAddress: string;
  accessToken: string;
  expiresAt: string;
  domain: MailDomain;
  restoreUrl: string;
  displayName: string;
};

export type AttachmentMeta = {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
  cid?: string | null;
};

export type InboxEmailSummary = {
  id: string;
  emailAddress: string;
  sender: string;
  subject: string;
  receivedAt: string;
  hasAttachments: boolean;
};

export type InboxEmailDetail = InboxEmailSummary & {
  bodyText: string;
  bodyHtml: string;
  attachments: AttachmentMeta[];
};

export type CreateInboxInput = {
  preferredDomain?: DomainPreference;
  customEmailAddress?: string;
};

export type CreateInboxResult = InboxSession;

export type GetInboxInput = {
  emailAddress: string;
  accessToken: string;
};

export type GetInboxResult = {
  session: Pick<InboxSession, "emailAddress" | "domain" | "expiresAt" | "displayName">;
  emails: InboxEmailSummary[];
};

export type GetEmailInput = {
  emailId: string;
  emailAddress: string;
  accessToken: string;
};

export type GetEmailResult = {
  email: InboxEmailDetail;
};

export type DeleteInboxInput = {
  emailAddress: string;
  accessToken: string;
};

export type DeleteInboxResult = {
  deleted: boolean;
};

export type LookupInboxInput = {
  emailAddress: string;
};

export type LookupEmailInput = {
  emailAddress: string;
  emailId: string;
};

export type FunctionHealthStatus = {
  createInboxUrl: string;
  getInboxUrl: string;
  getEmailUrl: string;
  deleteInboxUrl: string;
  receiveEmailUrl: string;
  apiEndpointConfigured: boolean;
  projectConfigured: boolean;
  apiKeyConfigured: boolean;
  functionStatuses: Array<{
    id: string;
    enabled: boolean;
    live: boolean;
    deploymentStatus: string | null;
  }>;
};
