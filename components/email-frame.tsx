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
      className="h-full min-h-[16rem] w-full rounded-[2rem] border border-white/10 bg-[#070707]"
      srcDoc={buildEmailSrcDoc(bodyHtml)}
    />
  );
}
