"use client";

import OnButton from "@/components/OnButton";
import SprayRevealTileArt from "@/components/SprayRevealTileArt";

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
          <div className="h-[220px] w-[320px] rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
            <SprayRevealTileArt
              label="SPRAY TO REVEAL"
              revealables={[
                { id: "g1", x: 0.22, y: 0.32, kind: "gem" },
                { id: "g2", x: 0.38, y: 0.58, kind: "gem" },
                { id: "g3", x: 0.62, y: 0.28, kind: "gem" },
                { id: "g4", x: 0.78, y: 0.52, kind: "gem" },
                { id: "g5", x: 0.52, y: 0.74, kind: "gem" },
              ]}
            />
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
          <div className="h-[220px] w-[320px] rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
            <SprayRevealTileArt
              label="SCAN FOR NEW"
              revealables={[
                { id: "p1", x: 0.25, y: 0.30, kind: "pin" },
                { id: "p2", x: 0.48, y: 0.44, kind: "pin" },
                { id: "p3", x: 0.70, y: 0.34, kind: "pin" },
                { id: "p4", x: 0.62, y: 0.62, kind: "pin" },
                { id: "p5", x: 0.34, y: 0.68, kind: "pin" },
              ]}
            />
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
