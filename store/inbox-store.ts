"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DomainPreference, InboxEmailDetail, InboxEmailSummary, InboxSession } from "@/shared/types";

type SyncStatus = "idle" | "creating" | "syncing" | "ready" | "deleting" | "error";

type InboxState = {
  hydrated: boolean;
  session: InboxSession | null;
  emails: InboxEmailSummary[];
  selectedEmailId: string | null;
  selectedEmail: InboxEmailDetail | null;
  syncStatus: SyncStatus;
  errorMessage: string | null;
  lastSyncedAt: string | null;
  domainPreference: DomainPreference;
  setHydrated: (value: boolean) => void;
  setSession: (session: InboxSession | null) => void;
  setEmails: (emails: InboxEmailSummary[]) => void;
  setSelectedEmailId: (emailId: string | null) => void;
  setSelectedEmail: (email: InboxEmailDetail | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setErrorMessage: (message: string | null) => void;
  setLastSyncedAt: (timestamp: string | null) => void;
  setDomainPreference: (preference: DomainPreference) => void;
  resetInbox: () => void;
};

export const useInboxStore = create<InboxState>()(
  persist(
    (set) => ({
      hydrated: false,
      session: null,
      emails: [],
      selectedEmailId: null,
      selectedEmail: null,
      syncStatus: "idle",
      errorMessage: null,
      lastSyncedAt: null,
      domainPreference: "random",
      setHydrated: (value) => set({ hydrated: value }),
      setSession: (session) => set({ session }),
      setEmails: (emails) =>
        set((state) => {
          const selectedEmailStillExists = state.selectedEmailId
            ? emails.some((email) => email.id === state.selectedEmailId)
            : false;

          return {
            emails,
            selectedEmailId: selectedEmailStillExists ? state.selectedEmailId : emails[0]?.id ?? null,
            selectedEmail: selectedEmailStillExists ? state.selectedEmail : null
          };
        }),
      setSelectedEmailId: (emailId) => set({ selectedEmailId: emailId }),
      setSelectedEmail: (email) => set({ selectedEmail: email }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setErrorMessage: (message) => set({ errorMessage: message }),
      setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),
      setDomainPreference: (preference) => set({ domainPreference: preference }),
      resetInbox: () =>
        set({
          session: null,
          emails: [],
          selectedEmailId: null,
          selectedEmail: null,
          syncStatus: "idle",
          errorMessage: null,
          lastSyncedAt: null
        })
    }),
    {
      name: "temp-mail-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        domainPreference: state.domainPreference
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      }
    }
  )
);
