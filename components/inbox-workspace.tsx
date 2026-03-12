"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  LoaderCircle,
  Mail,
  RefreshCcw,
  ScanLine,
  Shield,
  Sparkles,
  Trash2
} from "lucide-react";
import { EmailFrame } from "@/components/email-frame";
import { functionApi, publicEnv } from "@/lib/client-api";
import { formatRelativeTime, formatTimestamp } from "@/lib/time";
import { useInboxStore } from "@/store/inbox-store";
import { createRestoreUrl } from "@/shared/mailbox";
import type { DomainPreference, InboxSession, MailDomain } from "@/shared/types";

type InboxWorkspaceProps = {
  initialEmailAddress?: string;
};

function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function readHashToken() {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("token") ?? "";
}

function LiveIndicator({ syncStatus, lastSyncedAt }: { syncStatus: string; lastSyncedAt: string | null }) {
  const label =
    syncStatus === "creating"
      ? "Minting inbox"
      : syncStatus === "syncing"
        ? "Refreshing inbox"
        : syncStatus === "deleting"
          ? "Deleting inbox"
          : syncStatus === "error"
            ? "Needs attention"
            : "Live";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-aqua-400/20 bg-aqua-500/10 px-3 py-1 text-xs text-aqua-400">
      <span className={`h-2 w-2 rounded-full ${syncStatus === "error" ? "bg-red-400" : "bg-aqua-400"}`} />
      <span>{label}</span>
      {lastSyncedAt ? <span className="text-white/40">· {formatRelativeTime(lastSyncedAt)}</span> : null}
    </div>
  );
}

function DomainSelect({
  value,
  onChange
}: {
  value: DomainPreference;
  onChange: (value: DomainPreference) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-white/70">
      <span>Domain</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as DomainPreference)}
        className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-aqua-400/60"
      >
        <option value="random">Random rotation</option>
        {publicEnv.domains.map((domain) => (
          <option key={domain} value={domain}>
            {domain}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InboxWorkspace({ initialEmailAddress }: InboxWorkspaceProps) {
  const {
    hydrated,
    session,
    emails,
    selectedEmailId,
    selectedEmail,
    syncStatus,
    errorMessage,
    lastSyncedAt,
    domainPreference,
    setSession,
    setEmails,
    setSelectedEmailId,
    setSelectedEmail,
    setSyncStatus,
    setErrorMessage,
    setLastSyncedAt,
    setDomainPreference,
    resetInbox
  } = useInboxStore();
  const [copied, setCopied] = useState(false);
  const initializedRef = useRef(false);

  const activeEmailId = selectedEmailId ?? emails[0]?.id ?? null;
  const restoreUrl = useMemo(() => {
    if (!session) {
      return "";
    }

    return createRestoreUrl(publicEnv.restoreBaseUrl, session.emailAddress, session.accessToken);
  }, [session]);

  const syncInbox = useCallback(async (activeSession: InboxSession, shouldMarkStatus = true) => {
    try {
      if (shouldMarkStatus) {
        setSyncStatus("syncing");
      }

      const inbox = await functionApi.getInbox({
        emailAddress: activeSession.emailAddress,
        accessToken: activeSession.accessToken
      });

      setSession({
        ...activeSession,
        domain: inbox.session.domain as MailDomain,
        displayName: inbox.session.displayName,
        expiresAt: inbox.session.expiresAt,
        restoreUrl: createRestoreUrl(publicEnv.restoreBaseUrl, activeSession.emailAddress, activeSession.accessToken)
      });
      setEmails(inbox.emails);
      setLastSyncedAt(new Date().toISOString());
      setErrorMessage(null);
      setSyncStatus("ready");
    } catch (error) {
      setSyncStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh inbox");
    }
  }, [setEmails, setErrorMessage, setLastSyncedAt, setSession, setSyncStatus]);

  const createNewInbox = useCallback(async (preferredDomain = domainPreference) => {
    setSyncStatus("creating");
    setErrorMessage(null);
    setSelectedEmail(null);
    setSelectedEmailId(null);

    try {
      const result = await functionApi.createInbox({
        preferredDomain
      });

      const nextSession = {
        ...result,
        restoreUrl: createRestoreUrl(publicEnv.restoreBaseUrl, result.emailAddress, result.accessToken)
      };

      setSession(nextSession);
      setEmails([]);
      setLastSyncedAt(null);
      await syncInbox(nextSession, false);
    } catch (error) {
      setSyncStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to create inbox");
    }
  }, [domainPreference, setEmails, setErrorMessage, setLastSyncedAt, setSelectedEmail, setSelectedEmailId, setSession, setSyncStatus, syncInbox]);

  const restoreSession = useCallback(async (emailAddress: string, accessToken: string) => {
    const currentSession: InboxSession = {
      emailAddress,
      accessToken,
      expiresAt: new Date(Date.now() + publicEnv.pollIntervalMs).toISOString(),
      domain: (emailAddress.split("@")[1] ?? publicEnv.domains[0]) as MailDomain,
      restoreUrl: createRestoreUrl(publicEnv.restoreBaseUrl, emailAddress, accessToken),
      displayName: emailAddress.split("@")[0] ?? emailAddress
    };

    setSession(currentSession);
    await syncInbox(currentSession);
  }, [setSession, syncInbox]);

  const deleteActiveInbox = useCallback(async () => {
    if (!session) {
      return;
    }

    setSyncStatus("deleting");
    setErrorMessage(null);

    try {
      await functionApi.deleteInbox({
        emailAddress: session.emailAddress,
        accessToken: session.accessToken
      });
      resetInbox();
      await createNewInbox(domainPreference);
    } catch (error) {
      setSyncStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete inbox");
    }
  }, [createNewInbox, domainPreference, resetInbox, session, setErrorMessage, setSyncStatus]);

  async function copyEmailAddress() {
    if (!session) return;

    await navigator.clipboard.writeText(session.emailAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  useEffect(() => {
    if (!hydrated || initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    const hashToken = readHashToken();

    if (initialEmailAddress && hashToken) {
      void restoreSession(initialEmailAddress, hashToken);
      return;
    }

    if (session && !isExpired(session.expiresAt)) {
      void syncInbox(session);
      return;
    }

    void createNewInbox(domainPreference);
  }, [createNewInbox, domainPreference, hydrated, initialEmailAddress, restoreSession, session, syncInbox]);

  useEffect(() => {
    if (!session || syncStatus === "creating" || syncStatus === "deleting") {
      return;
    }

    const interval = window.setInterval(() => {
      void syncInbox(session);
    }, publicEnv.pollIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [session, syncStatus, syncInbox]);

  useEffect(() => {
    if (!session || !activeEmailId) {
      return;
    }

    if (selectedEmail && selectedEmail.id === activeEmailId) {
      return;
    }

    startTransition(() => {
      void functionApi
        .getEmail({
          emailId: activeEmailId,
          emailAddress: session.emailAddress,
          accessToken: session.accessToken
        })
        .then((result) => {
          setSelectedEmail(result.email);
          setErrorMessage(null);
        })
        .catch((error) => {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load email");
        });
    });
  }, [activeEmailId, session, selectedEmail, setSelectedEmail, setErrorMessage]);

  const attachments = selectedEmail?.attachments ?? [];

  return (
    <main className="min-h-screen bg-hero-grid px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,138,61,0.14),transparent_35%),linear-gradient(180deg,rgba(11,31,40,0.94),rgba(4,19,26,0.94))] p-6 shadow-panel sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/60">
                <Sparkles className="h-3.5 w-3.5 text-flare-400" />
                Appwrite + Mailgun temp mail
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Temporary inboxes with human-style addresses, zero signup, and private restore links.
                </h1>
                <p className="max-w-2xl text-base text-white/65 sm:text-lg">
                  Generate a realistic address, watch it refresh every five seconds, and open HTML emails inside a
                  locked-down viewer.
                </p>
              </div>
              <div className="grid gap-4 rounded-[1.75rem] border border-aqua-400/15 bg-white/5 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <LiveIndicator syncStatus={syncStatus} lastSyncedAt={lastSyncedAt} />
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
                      <Shield className="h-3.5 w-3.5 text-aqua-400" />
                      Private via access token
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.22em] text-white/45">Active inbox</p>
                    <div className="break-all font-[family-name:var(--font-mono)] text-xl text-aqua-400 sm:text-2xl">
                      {session?.emailAddress ?? "Generating inbox..."}
                    </div>
                    <p className="mt-2 text-sm text-white/45">
                      {session ? `Expires ${formatTimestamp(session.expiresAt)}` : "Reserving an address and access token."}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:min-w-56">
                  <DomainSelect value={domainPreference} onChange={setDomainPreference} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={copyEmailAddress}
                      disabled={!session}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-aqua-400/25 bg-aqua-500/15 px-4 text-sm font-medium text-aqua-100 transition hover:border-aqua-400/50 hover:bg-aqua-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void createNewInbox(domainPreference)}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-flare-400/30 bg-flare-500/15 px-4 text-sm font-medium text-flare-100 transition hover:border-flare-400/60 hover:bg-flare-500/20"
                    >
                      {syncStatus === "creating" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                      Generate new
                    </button>
                  </div>
                </div>
              </div>
              {errorMessage ? (
                <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessage}</div>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/15 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
                <ScanLine className="h-4 w-4 text-aqua-400" />
                Restore on another device
              </div>
              <div className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-dashed border-white/15 bg-ink-950/70 px-4 py-5">
                {restoreUrl ? (
                  <QRCodeSVG
                    value={restoreUrl}
                    size={164}
                    bgColor="transparent"
                    fgColor="#d7f2f5"
                    includeMargin={false}
                  />
                ) : (
                  <div className="flex h-[164px] w-[164px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white/35">
                    Preparing
                  </div>
                )}
                <p className="text-center text-sm text-white/55">
                  The restore URL keeps the inbox private by carrying the token in the URL hash.
                </p>
                {restoreUrl ? (
                  <a
                    href={restoreUrl}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/80 transition hover:border-aqua-400/40 hover:text-white"
                  >
                    Open restore link
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid flex-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="flex min-h-[32rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(10,31,40,0.82)] shadow-panel">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Inbox stream</p>
                <h2 className="mt-1 text-lg text-white">Latest emails</h2>
              </div>
              <button
                type="button"
                onClick={() => void deleteActiveInbox()}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 px-3 text-sm text-white/65 transition hover:border-red-400/40 hover:text-red-200"
              >
                <Trash2 className="h-4 w-4" />
                Reset inbox
              </button>
            </div>

            <div className="mail-scrollbar flex-1 overflow-y-auto p-3">
              {emails.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
                  <Mail className="h-10 w-10 text-white/25" />
                  <div className="space-y-1">
                    <p className="text-white/70">Inbox is waiting for mail.</p>
                    <p className="text-sm text-white/40">Send something to the address above and it will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {emails.map((email) => {
                    const selected = email.id === activeEmailId;

                    return (
                      <button
                        key={email.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmailId(email.id);
                          setSelectedEmail(null);
                        }}
                        className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                          selected
                            ? "border-aqua-400/45 bg-aqua-500/10"
                            : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-aqua-300">{email.sender}</p>
                            <p className="mt-1 truncate text-base text-white">{email.subject}</p>
                          </div>
                          {email.hasAttachments ? (
                            <span className="rounded-full border border-flare-400/30 bg-flare-500/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-flare-200">
                              Files
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-xs text-white/40">{formatTimestamp(email.receivedAt)}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="min-h-[32rem] rounded-[2rem] border border-white/10 bg-[rgba(7,28,36,0.85)] p-5 shadow-panel">
            {selectedEmail ? (
              <div className="flex h-full flex-col gap-5">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-aqua-300">{selectedEmail.sender}</p>
                      <h3 className="mt-1 text-2xl text-white">{selectedEmail.subject}</h3>
                    </div>
                    <div className="text-sm text-white/45">{formatTimestamp(selectedEmail.receivedAt)}</div>
                  </div>
                </div>

                <EmailFrame bodyHtml={selectedEmail.bodyHtml} />

                <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/45">Plain text</p>
                    <pre className="mail-scrollbar max-h-48 overflow-auto whitespace-pre-wrap font-[family-name:var(--font-mono)] text-sm text-white/70">
                      {selectedEmail.bodyText || "No plain text body provided."}
                    </pre>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/45">Attachments</p>
                    {attachments.length === 0 ? (
                      <p className="text-sm text-white/45">No attachments.</p>
                    ) : (
                      <div className="space-y-2">
                        {attachments.map((attachment) => (
                          <a
                            key={attachment.fileId}
                            href={`/api/attachments/${attachment.fileId}?emailId=${encodeURIComponent(
                              selectedEmail.id
                            )}&emailAddress=${encodeURIComponent(selectedEmail.emailAddress)}&accessToken=${encodeURIComponent(
                              session?.accessToken ?? ""
                            )}`}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 transition hover:border-aqua-400/35 hover:text-white"
                          >
                            <span className="truncate">{attachment.filename}</span>
                            <span className="text-xs text-white/40">{Math.ceil(attachment.size / 1024)} KB</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] text-center">
                <Mail className="h-12 w-12 text-white/25" />
                <div className="space-y-1">
                  <p className="text-lg text-white/75">Select an email to open it.</p>
                  <p className="text-sm text-white/40">HTML content will render inside a sandboxed iframe.</p>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
