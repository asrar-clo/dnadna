import Link from 'next/link';
import { Fraunces, Inter } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const reframe = [
  {
    label: 'VoiceDNA',
    points: ['Any link, text, PDF, or screenshot', 'Plain answer in under 10 seconds', 'Nothing to set up or learn'],
    active: true,
  },
  {
    label: 'Research tools',
    points: ['Long reports, transcripts, filings', 'Multi-document comparison', 'Citation tracking to manage'],
    active: false,
  },
];

export default function LandingPage() {
  return (
    <main
      className={`${fraunces.variable} ${inter.variable} font-sans min-h-screen bg-midnight text-bone`}
    >
      {/* subtle vignette so the ink bg doesn't feel flat */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.15]"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(244,198,74,0.25) 0%, rgba(244,198,74,0) 60%)',
        }}
      />

      <header className="relative flex items-center justify-center px-6 pt-8">
        <div className="flex items-center gap-2.5">
          <img src="/logo-mark.svg" alt="" width={28} height={28} className="rounded-lg" />
          <span className="font-display text-lg font-medium tracking-tight text-bone">
            VoiceDNA
          </span>
        </div>
      </header>

      <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xl motion-safe:animate-rise">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-smoke">
            Not a research tool
          </p>

          <h1 className="font-display text-[2.1rem] leading-[1.15] font-medium tracking-tight text-bone sm:text-5xl sm:leading-[1.1]">
            For the confusing thing{' '}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-[0.1em] top-[0.42em] -z-10 origin-left rounded-[2px] bg-marker/90 motion-safe:animate-reveal"
                style={{ transform: 'scaleX(1)' }}
              />
              <span className="relative text-midnight">in front of you</span>
            </span>{' '}
            right now.
          </h1>

          <p className="mx-auto mt-6 max-w-md text-balance text-lg leading-relaxed text-smoke">
            A screenshot from a group chat. A clause in your lease. A PDF nobody
            bothered to explain. Paste it, get it back in plain English.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <Link
              href="/login"
              className="inline-block rounded-lg bg-marker px-7 py-3.5 font-semibold text-midnight transition hover:bg-marker-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-marker focus-visible:ring-offset-2 focus-visible:ring-offset-midnight"
            >
              Explain something free
            </Link>
            <p className="text-sm text-smoke/80">
              3 free explanations a day. No dashboard to learn.
            </p>
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/10 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-2xl font-medium text-bone sm:text-3xl">
            Built different, on purpose.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-smoke">
            Tools built for professional researchers are built for a different job.
            We picked one job and kept it fast.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {reframe.map((col) => (
              <div
                key={col.label}
                className={`rounded-2xl border p-6 ${
                  col.active
                    ? 'border-marker/40 bg-midnight-2'
                    : 'border-white/10 bg-midnight-2/40'
                }`}
              >
                <p
                  className={`text-sm font-semibold uppercase tracking-wide ${
                    col.active ? 'text-marker' : 'text-smoke'
                  }`}
                >
                  {col.label}
                </p>
                <ul className="mt-4 space-y-3">
                  {col.points.map((point) => (
                    <li
                      key={point}
                      className={`text-sm leading-relaxed ${
                        col.active ? 'text-bone' : 'text-smoke'
                      }`}
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
