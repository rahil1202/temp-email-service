"use client";

import { buildEmailSrcDoc } from "@/lib/email-viewer";

type EmailFrameProps = {
  bodyHtml: string;
};

export function EmailFrame({ bodyHtml }: EmailFrameProps) {
  return (
    <iframe
      title="Email content"
      sandbox=""
      className="h-[28rem] w-full rounded-3xl border border-white/10 bg-ink-950"
      srcDoc={buildEmailSrcDoc(bodyHtml)}
    />
  );
}
