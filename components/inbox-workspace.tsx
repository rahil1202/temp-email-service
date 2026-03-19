"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  Github,
  Info,
  Linkedin,
  LoaderCircle,
  Lock,
  Mail,
  Search,
  RefreshCcw,
  ScanLine,
  Share2,
  ArrowUpRight,
  Trash2
} from "lucide-react";
import { EmailFrame } from "@/components/email-frame";
import { functionApi, publicEnv } from "@/lib/client-api";
import { formatRelativeTime, formatTimestamp } from "@/lib/time";
import { useInboxStore } from "@/store/inbox-store";
import { createRestoreUrl } from "@/shared/mailbox";
import type { DomainPreference, FunctionHealthStatus, InboxSession, MailDomain } from "@/shared/types";

type InboxWorkspaceProps = {
  initialEmailAddress?: string;
};

function splitEmailAddress(emailAddress: string) {
  const normalized = emailAddress.trim().toLowerCase();
  const [localPart = "", domain = ""] = normalized.split("@");
  return { localPart, domain };
}

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
      ? "Creating"
      : syncStatus === "syncing"
        ? "Refreshing"
        : syncStatus === "deleting"
          ? "Resetting"
          : syncStatus === "error"
            ? "Error"
            : "Live";

  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/70">
      <span className={`h-2 w-2 rounded-full ${syncStatus === "error" ? "bg-redtone-400" : "bg-green-400"}`} />
      <span>{label}</span>
      {lastSyncedAt ? <span className="text-white/35">{formatRelativeTime(lastSyncedAt)}</span> : null}
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
      <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">Domain</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as DomainPreference)}
        className="h-12 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-redtone-400/60"
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
  const [modalOpen, setModalOpen] = useState(false);
  const [health, setHealth] = useState<FunctionHealthStatus | null>(null);
  const [healthOpen, setHealthOpen] = useState(false);
  const [lookupEmailAddress, setLookupEmailAddress] = useState("");
  const [lookupMode, setLookupMode] = useState(false);
  const [draftEmailAddress, setDraftEmailAddress] = useState("");
  const initializedRef = useRef(false);

  const activeEmailId = selectedEmailId ?? emails[0]?.id ?? null;
  const sessionDomain = session?.emailAddress ? splitEmailAddress(session.emailAddress).domain : session?.domain ?? "";
  const draftParts = splitEmailAddress(draftEmailAddress);
  const lockedDomain =
    domainPreference !== "random"
      ? domainPreference
      : (draftParts.domain || sessionDomain || publicEnv.domains[0] || "");
  const editableLocalPart = draftParts.localPart;
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
    setLookupMode(false);
    setSelectedEmail(null);
    setSelectedEmailId(null);

    try {
      const normalizedDraft = draftEmailAddress.trim().toLowerCase();
      const currentEmail = session?.emailAddress?.trim().toLowerCase() ?? "";
      const nextPreferredDomain =
        preferredDomain === "random" && session?.domain ? session.domain : preferredDomain;
      const result = await functionApi.createInbox({
        preferredDomain: nextPreferredDomain,
        customEmailAddress: normalizedDraft && normalizedDraft !== currentEmail ? normalizedDraft : undefined
      });

      const nextSession = {
        ...result,
        restoreUrl: createRestoreUrl(publicEnv.restoreBaseUrl, result.emailAddress, result.accessToken)
      };

      setSession(nextSession);
      setEmails([]);
      setLastSyncedAt(null);
      setDraftEmailAddress(result.emailAddress);
      await syncInbox(nextSession, false);
    } catch (error) {
      setSyncStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to create inbox");
    }
  }, [domainPreference, draftEmailAddress, session?.domain, session?.emailAddress, setEmails, setErrorMessage, setLastSyncedAt, setSelectedEmail, setSelectedEmailId, setSession, setSyncStatus, syncInbox]);

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
    setLookupMode(false);
    setDraftEmailAddress(emailAddress);
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

  async function copyRestoreUrl() {
    if (!restoreUrl) {
      return;
    }

    await navigator.clipboard.writeText(restoreUrl);
  }

  async function openTypedInbox() {
    if (!lookupEmailAddress.trim()) {
      setErrorMessage("Enter an inbox email address");
      return;
    }

    setSyncStatus("syncing");
    setErrorMessage(null);
    setSelectedEmail(null);
    setSelectedEmailId(null);

    try {
      const result = await functionApi.lookupInbox({
        emailAddress: lookupEmailAddress.trim()
      });

      setLookupMode(true);
      setSession({
        emailAddress: result.session.emailAddress,
        accessToken: "",
        expiresAt: result.session.expiresAt,
        domain: result.session.domain as MailDomain,
        restoreUrl: "",
        displayName: result.session.displayName
      });
      setEmails(result.emails);
      setDraftEmailAddress(result.session.emailAddress);
      setLastSyncedAt(new Date().toISOString());
      setSyncStatus("ready");
    } catch (error) {
      setLookupMode(false);
      setSyncStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to open inbox");
    }
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
    if (!session || lookupMode || syncStatus === "creating" || syncStatus === "deleting") {
      return;
    }

    const interval = window.setInterval(() => {
      void syncInbox(session);
    }, publicEnv.pollIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [lookupMode, session, syncStatus, syncInbox]);

  useEffect(() => {
    if (!session || !activeEmailId) {
      return;
    }

    if (selectedEmail && selectedEmail.id === activeEmailId) {
      return;
    }

    startTransition(() => {
      const request = lookupMode
        ? functionApi.lookupEmail({
            emailId: activeEmailId,
            emailAddress: session.emailAddress
          })
        : functionApi.getEmail({
            emailId: activeEmailId,
            emailAddress: session.emailAddress,
            accessToken: session.accessToken
          });

      void request
        .then((result) => {
          setSelectedEmail(result.email);
          setErrorMessage(null);
        })
        .catch((error) => {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load email");
        });
    });
  }, [activeEmailId, lookupMode, session, selectedEmail, setSelectedEmail, setErrorMessage]);

  useEffect(() => {
    void functionApi.getHealth().then(setHealth).catch(() => null);
  }, []);

  useEffect(() => {
    if (session?.emailAddress) {
      setDraftEmailAddress(session.emailAddress);
    }
  }, [session?.emailAddress]);

  function handleDraftLocalPartChange(value: string) {
    const nextLocalPart = value.trim().toLowerCase().replace(/@.*$/, "");
    setDraftEmailAddress(nextLocalPart ? `${nextLocalPart}@${lockedDomain}` : "");
  }

  function handleDomainPreferenceChange(value: DomainPreference) {
    setDomainPreference(value);
    const nextDomain =
      value !== "random"
        ? value
        : (draftParts.domain || sessionDomain || publicEnv.domains[0] || "");

    setDraftEmailAddress(draftParts.localPart ? `${draftParts.localPart}@${nextDomain}` : "");
  }

  const attachments = selectedEmail?.attachments ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-[-20%] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(88,8,14,0.08),rgba(182,29,34,0.22),rgba(58,6,10,0.1),rgba(217,46,52,0.2),rgba(88,8,14,0.08))] blur-3xl animate-[redFlow_30s_linear_infinite]" />
        <div className="absolute -left-[14%] top-[-22%] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle,rgba(182,29,34,0.44),rgba(182,29,34,0.14)_42%,transparent_70%)] blur-3xl animate-[redDrift_18s_ease-in-out_infinite]" />
        <div className="absolute right-[-12%] top-[4%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(217,46,52,0.34),rgba(125,20,24,0.12)_48%,transparent_72%)] blur-3xl animate-[redFlow_26s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-[-24%] left-[12%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(125,20,24,0.34),rgba(182,29,34,0.1)_42%,transparent_70%)] blur-3xl animate-[redDrift_22s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-18%] right-[10%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(143,16,22,0.3),rgba(90,10,16,0.08)_44%,transparent_70%)] blur-3xl animate-[redFlow_34s_ease-in-out_infinite]" />
      </div>

      <div className="relative mx-auto grid h-[calc(100vh-2rem)] max-w-7xl grid-rows-[auto_minmax(0,1fr)_auto] gap-4">
        <header className="glass-panel rounded-[1.75rem] border border-white/10 px-4 py-3 shadow-panel sm:px-5 sm:py-4">
          <div className="flex h-full flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-white/34">Temp Mail</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LiveIndicator syncStatus={syncStatus} lastSyncedAt={lastSyncedAt} />
                <button
                  type="button"
                  onClick={() => setHealthOpen((current) => !current)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white/80 transition hover:border-redtone-400/35 hover:bg-redtone-500/10 hover:text-white"
                >
                  <Info className="h-4 w-4" />
                  Health
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white/80 transition hover:border-redtone-400/35 hover:bg-redtone-500/10 hover:text-white"
                >
                  <Share2 className="h-4 w-4" />
                    Share
                </button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
              <div className="glass-soft min-w-0 rounded-[1.25rem] border border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-sm sm:text-lg">
                  <input
                    type="text"
                    value={editableLocalPart}
                    onChange={(event) => handleDraftLocalPartChange(event.target.value)}
                    placeholder="name"
                    className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/28"
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <span className="shrink-0 text-white/70">@{lockedDomain}</span>
                  <Lock className="h-4 w-4 shrink-0 text-white/35" />
                </div>
              </div>

              {/* <div className="min-w-[13rem]">
                <DomainSelect value={domainPreference} onChange={handleDomainPreferenceChange} />
              </div> */}

              <div className="glass-soft flex min-w-[16rem] items-center gap-2 rounded-[1.25rem] border border-white/10 px-3 py-2">
                <Search className="h-4 w-4 text-white/40" />
                <input
                  type="email"
                  value={lookupEmailAddress}
                  onChange={(event) => setLookupEmailAddress(event.target.value)}
                  placeholder="Open existing inbox"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/28"
                />
                <button
                  type="button"
                  onClick={() => void openTypedInbox()}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 px-3 text-xs uppercase tracking-[0.18em] text-white/75 transition hover:border-white/20 hover:text-white"
                >
                  Open
                </button>
              </div>

              <button
                type="button"
                onClick={copyEmailAddress}
                disabled={!session}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white px-5 text-sm font-medium text-black transition hover:bg-[#f3eaea] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </button>

              <button
                type="button"
                onClick={() => void createNewInbox(domainPreference)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-redtone-400/40 bg-redtone-500/20 px-5 text-sm font-medium text-white transition hover:bg-redtone-500/30"
              >
                {syncStatus === "creating" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                New
              </button>
            </div>

            {errorMessage ? (
              <div className="rounded-[1.1rem] border border-redtone-400/30 bg-redtone-500/10 px-4 py-2.5 text-sm text-white">
                {errorMessage}
              </div>
            ) : null}

            {healthOpen && health ? (
              <div className="rounded-[1.1rem] border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/72">
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-1">
                    <p className="uppercase tracking-[0.18em] text-white/35">Proxy URLs</p>
                    <p>Create: {health.createInboxUrl || "missing"}</p>
                    <p>Inbox: {health.getInboxUrl || "missing"}</p>
                    <p>Email: {health.getEmailUrl || "missing"}</p>
                    <p>Delete: {health.deleteInboxUrl || "missing"}</p>
                    <p>Receive: {health.receiveEmailUrl || "missing"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="uppercase tracking-[0.18em] text-white/35">Server Config</p>
                    <p>API endpoint: {health.apiEndpointConfigured ? "ok" : "missing"}</p>
                    <p>Project: {health.projectConfigured ? "ok" : "missing"}</p>
                    <p>API key: {health.apiKeyConfigured ? "ok" : "missing"}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="uppercase tracking-[0.18em] text-white/35">Functions</p>
                  {health.functionStatuses.map((item) => (
                    <p key={item.id}>
                      {item.id}: {item.enabled ? "enabled" : "disabled"}, {item.live ? "live" : "not live"}, deployment {item.deploymentStatus ?? "unknown"}
                    </p>
                  ))}
                  <p>Daily new inbox limit per IP: 3</p>
                  <p>Custom inbox rule: supported domain only, safe characters only, max 32 chars before @.</p>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <section className="grid min-h-0 max-h-full gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="glass-panel flex min-h-0 max-h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 shadow-panel">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/36">Inbox</p>
                <h2 className="mt-1 font-[family-name:var(--font-heading)] text-2xl text-white">Mail</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (session) {
                      void syncInbox(session);
                    }
                  }}
                  disabled={!session || syncStatus === "creating" || syncStatus === "deleting"}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Refresh inbox"
                >
                  <RefreshCcw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteActiveInbox()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:border-redtone-400/40 hover:bg-redtone-500/10 hover:text-white"
                  aria-label="Reset inbox"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mail-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
              {emails.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
                  <Mail className="h-10 w-10 text-white/20" />
                  <div className="space-y-1">
                    <p className="text-white/72">Waiting.</p>
                    <p className="text-sm text-white/38">Send mail to the address above.</p>
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
                            ? "border-redtone-400/45 bg-[linear-gradient(135deg,rgba(182,29,34,0.18),rgba(255,255,255,0.03))]"
                            : "border-white/8 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-white/38">{email.sender}</p>
                            <p className="mt-2 truncate text-base text-white">{email.subject}</p>
                          </div>
                          {lookupMode ? (
                            <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/42">
                              Last 24h
                            </span>
                          ) : email.hasAttachments ? (
                            <span className="rounded-full border border-redtone-400/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-redtone-300">
                              File
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-4 text-xs text-white/32">{formatTimestamp(email.receivedAt)}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="glass-panel min-h-0 max-h-full rounded-[2rem] border border-white/10 p-4 shadow-panel sm:p-5">
            {selectedEmail ? (
              <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] uppercase tracking-[0.2em] text-white/38">{selectedEmail.sender}</p>
                      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl leading-tight text-white sm:text-3xl">
                        {selectedEmail.subject}
                      </h3>
                    </div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/30">{formatTimestamp(selectedEmail.receivedAt)}</div>
                  </div>
                </div>

                <div className="min-h-0 flex-1">
                  <EmailFrame bodyHtml={selectedEmail.bodyHtml} />
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_0.82fr]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-4">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-white/35">Text</p>
                    <pre className="mail-scrollbar max-h-48 overflow-auto whitespace-pre-wrap font-[family-name:var(--font-mono)] text-sm text-white/68">
                      {selectedEmail.bodyText || "No plain text body provided."}
                    </pre>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-4">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-white/35">Files</p>
                    {attachments.length === 0 ? (
                      <p className="text-sm text-white/40">None</p>
                    ) : lookupMode ? (
                      <div className="flex items-center gap-2 rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
                        <Lock className="h-4 w-4" />
                        Attachments are hidden in email-only lookup mode.
                      </div>
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
                            className="flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-white/82 transition hover:border-redtone-400/35 hover:bg-redtone-500/10 hover:text-white"
                          >
                            <span className="truncate">{attachment.filename}</span>
                            <span className="text-xs text-white/35">{Math.ceil(attachment.size / 1024)} KB</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] text-center">
                <Mail className="h-12 w-12 text-white/20" />
                <div className="space-y-1">
                  <p className="font-[family-name:var(--font-heading)] text-3xl text-white">Open one.</p>
                  <p className="text-sm text-white/38">Mail appears here.</p>
                </div>
              </div>
            )}
          </section>
        </section>

        <footer className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/48">
            <Link href="/privacy-policy" className="transition hover:text-white">Privacy Policy</Link>
            <Link href="/contact-us" className="transition hover:text-white">Contact Us</Link>
            <Link href="/terms" className="transition hover:text-white">Terms</Link>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://x.com/rahil1202"
              aria-label="X"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/68 transition hover:border-redtone-400/40 hover:text-white"
            >
              <span className="text-xs font-medium">X</span>
            </a>
            <a
              href="https://linkedin.com/in/rahil-vahora"
              aria-label="LinkedIn"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/68 transition hover:border-redtone-400/40 hover:text-white"
            >
              <Linkedin className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://github.com/rahil1202/temp-email-service"
              aria-label="GitHub"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/68 transition hover:border-redtone-400/40 hover:text-white"
            >
              <Github className="h-3.5 w-3.5" />
            </a>
          </div>
        </footer>
      </div>

      {modalOpen ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-[2rem] border border-white/10 p-5 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/34">Restore</p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl text-white">Share inbox.</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:border-redtone-400/40 hover:text-white"
                aria-label="Close restore modal"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-4 rounded-[1.5rem] border border-dashed border-white/12 bg-[#090909] px-4 py-5">
              {restoreUrl ? (
                <>
                  <div className="rounded-[1.5rem] bg-white p-3">
                    <QRCodeSVG value={restoreUrl} size={156} bgColor="transparent" fgColor="#111111" includeMargin={false} />
                  </div>
                  <div className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72">
                    <div className="truncate">{restoreUrl}</div>
                  </div>
                  <div className="grid w-full gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void copyRestoreUrl()}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white px-4 text-sm font-medium text-black transition hover:bg-[#f3eaea]"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                    <a
                      href={restoreUrl}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-redtone-400/40 bg-redtone-500/20 px-4 text-sm font-medium text-white transition hover:bg-redtone-500/30"
                    >
                      Open
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex h-[180px] w-[180px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03] text-sm text-white/35">
                  Preparing
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
