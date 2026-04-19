"use client";


export default function Hero() {

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 on-hero-glow" />

      <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
        <div className="md:col-span-7">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/on-stack-v2/ON-TRACKER-white.svg" alt="ON TRACKER" className="h-8 md:h-10" />
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
            Find microcap gems.
            <br />
            Track what matters.
            <br />
            Win earlier.
          </h1>

          <p className="mt-4 max-w-xl text-sm text-zinc-300 md:text-base">
            ON TRACKER is a public dashboard for microcap discovery: outlook scoring, socials, categories, and new listings.
            Built to be fast, visual, and fun to explore.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-zinc-800 bg-zinc-900/30 px-4 py-2 text-xs text-zinc-300">
              No login required
            </div>
            <div className="rounded-full border border-zinc-800 bg-zinc-900/30 px-4 py-2 text-xs text-zinc-300">
              De-duped across sources
            </div>
            <div className="rounded-full border border-zinc-800 bg-zinc-900/30 px-4 py-2 text-xs text-zinc-300">
              Built for watchlists (soon)
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
              <div className="text-[11px] text-zinc-400">Universe</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">$500k–$20M</div>
              <div className="mt-1 text-[11px] text-zinc-500">Market cap band</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
              <div className="text-[11px] text-zinc-400">Signals</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">Outlook</div>
              <div className="mt-1 text-[11px] text-zinc-500">Score + grade</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
              <div className="text-[11px] text-zinc-400">Social</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">Active</div>
              <div className="mt-1 text-[11px] text-zinc-500">Followers + activity</div>
            </div>
          </div>
        </div>

        <div className="md:col-span-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
            <div className="text-xs text-zinc-400">Gem finder (hero animation)</div>

            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="on-hero-radar">
                <div className="on-hero-radar-sweep" />
                <div className="on-hero-radar-dot d1" />
                <div className="on-hero-radar-dot d2" />
                <div className="on-hero-radar-dot d3" />
                <div className="on-hero-radar-dot d4" />
                <div className="on-hero-radar-dot d5" />
                <div className="on-hero-radar-gem" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                <div className="text-zinc-500">Search</div>
                <div className="mt-1 font-semibold">Categories · chains</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                <div className="text-zinc-500">Track</div>
                <div className="mt-1 font-semibold">Outlook · socials</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
