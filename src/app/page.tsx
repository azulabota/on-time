import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/ontime-mark-yellow.svg" alt="OnTime" className="h-9 w-9" />
            <div>
              <h1 className="text-2xl font-semibold leading-tight">OnTime</h1>
              <div className="text-sm text-zinc-400">A product by OnStx</div>
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/onstx.svg" alt="OnStx" className="h-7 opacity-90" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Link
            href="/microcaps"
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-900/70"
          >
            <div className="text-lg font-medium">Small-cap token research</div>
            <div className="mt-2 text-sm text-zinc-400">Grades + realistic success projections.</div>
          </Link>

          <Link
            href="/newtokens"
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-900/70"
          >
            <div className="text-lg font-medium">New projects (twice weekly)</div>
            <div className="mt-2 text-sm text-zinc-400">Token launches + product launches discovered by scanning sources.</div>
          </Link>

          <Link
            href="/universe"
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-900/70"
          >
            <div className="text-lg font-medium">Project Universe (1M–20M cap)</div>
            <div className="mt-2 text-sm text-zinc-400">Seed list + metered outlook score.</div>
          </Link>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-lg font-medium">Coming next</div>
            <div className="mt-2 text-sm text-zinc-400">CoinMarketCap sync + richer progress tracking.</div>
          </div>
        </div>

        <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="font-medium">Admin ingestion</div>
          <div className="mt-2 text-sm text-zinc-400">
            The app exposes server-only ingestion endpoints (protected by an API key)
            so scheduled jobs can write new rows into Supabase.
          </div>
        </div>
      </div>
    </main>
  );
}
