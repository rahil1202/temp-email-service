import Link from "next/link";

type ContentPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
};

export function ContentPage({ eyebrow, title, intro, sections }: ContentPageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[12%] top-[-18%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(182,29,34,0.38),rgba(182,29,34,0.08)_45%,transparent_70%)] blur-3xl animate-[redDrift_18s_ease-in-out_infinite]" />
        <div className="absolute right-[-10%] top-[12%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(217,46,52,0.28),rgba(125,20,24,0.08)_48%,transparent_72%)] blur-3xl animate-[redDrift_24s_ease-in-out_infinite_reverse]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col gap-4">
        <header className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(182,29,34,0.18),transparent_36%),linear-gradient(180deg,rgba(17,17,17,0.96),rgba(8,8,8,0.98))] px-5 py-4 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/34">{eyebrow}</p>
              <h1 className="mt-2 font-[family-name:var(--font-heading)] text-4xl leading-none text-white">{title}</h1>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white/80 transition hover:border-redtone-400/35 hover:bg-redtone-500/10 hover:text-white"
            >
              Back
            </Link>
          </div>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.94),rgba(7,7,7,0.98))] p-6 shadow-panel">
          <p className="max-w-3xl text-sm leading-7 text-white/62">{intro}</p>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.heading} className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-5">
                <h2 className="font-[family-name:var(--font-heading)] text-2xl text-white">{section.heading}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-white/62">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
