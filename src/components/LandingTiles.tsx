"use client";

import OnButton from "@/components/OnButton";

function MicrocapTile() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-6 overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0 on-tile-glow" />
      <div className="relative z-10 flex items-start justify-between gap-6">
        <div>
          <div className="text-sm font-semibold">Microcap Gem Tracker</div>
          <div className="mt-2 text-sm text-zinc-300 max-w-md">
            Microcap project monitor. Filter by chain/category, rank by outlook and socials, then save your favorites.
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-400">
            <span className="rounded-full border border-zinc-800 bg-zinc-950/30 px-2 py-1">Outlook score</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950/30 px-2 py-1">Categories</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950/30 px-2 py-1">Social activity</span>
          </div>

          <div className="mt-5">
            <OnButton href="/microcaps" variant="primary">Open Microcaps</OnButton>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="on-tile-magnifier">
            <div className="on-tile-magnifier-glass" />
            <div className="on-tile-magnifier-handle" />
            <div className="on-tile-magnifier-scan" />
            <div className="on-tile-dot a" />
            <div className="on-tile-dot b" />
            <div className="on-tile-dot c" />
            <div className="on-tile-dot d" />
            <div className="on-tile-dot e" />
            <div className="on-tile-dot gem" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NewProjectsTile() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-6 overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0 on-tile-glow-2" />
      <div className="relative z-10 flex items-start justify-between gap-6">
        <div>
          <div className="text-sm font-semibold">New Project Tracker</div>
          <div className="mt-2 text-sm text-zinc-300 max-w-md">
            Fresh listings from CoinGecko + CoinMarketCap (official API). De-duped so you see what’s actually new.
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-400">
            <span className="rounded-full border border-zinc-800 bg-zinc-950/30 px-2 py-1">New listings</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950/30 px-2 py-1">Source tags</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950/30 px-2 py-1">Twice weekly</span>
          </div>

          <div className="mt-5">
            <OnButton href="/newtokens" variant="ghost">Open New Projects</OnButton>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="on-tile-ticker">
            <div className="on-tile-row r1" />
            <div className="on-tile-row r2" />
            <div className="on-tile-row r3" />
            <div className="on-tile-row r4" />
            <div className="on-tile-row r5" />
            <div className="on-tile-row r6" />
            <div className="on-tile-row r7" />
            <div className="on-tile-row r8" />
            <div className="on-tile-row r9" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingTiles() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
      <MicrocapTile />
      <NewProjectsTile />
    </div>
  );
}
