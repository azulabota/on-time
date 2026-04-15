import Link from "next/link";
import { supabaseAnonSafe } from "@/lib/supabaseClient";
import type { ProjectUniverseItem } from "@/lib/types";

export const revalidate = 60;

function fmtUsd(n: number | null) {
  if (n === null || typeof n !== "number" || !Number.isFinite(n)) return "–";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function pct(n: number | null) {
  if (n === null || typeof n !== "number" || !Number.isFinite(n)) return "–";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(1)}%`;
}

function ScoreMeter({ score }: { score: number | null }) {
  const s = score ?? 0;
  const w = Math.max(0, Math.min(100, Math.round(s)));
  const color = w >= 75 ? "bg-emerald-400" : w >= 55 ? "bg-sky-400" : w >= 40 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-xs text-zinc-400">Outlook</div>
        <div className="text-xs text-zinc-300">{score === null ? "–" : `${w}/100`}</div>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-2 ${color}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

export default async function UniversePage() {
  const supabase = supabaseAnonSafe();

  if (!supabase) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Project Universe (1M–20M cap)</h1>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-300">
            This deployment is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </div>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("project_universe")
    .select("*")
    .order("market_cap_usd", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as ProjectUniverseItem[];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Project Universe (1M–20M cap)</h1>
            <div className="mt-1 text-sm text-zinc-400">
              Seeded from CoinGecko now. CoinMarketCap will be added once we connect an API key.
            </div>
          </div>
          <Link className="text-sm text-sky-400 hover:underline" href="/">
            Home
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm">
            Error loading data: {error.message}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <div key={`${p.source}:${p.external_id}`} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="h-10 w-10 rounded-full border border-zinc-800" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-800" />
                  )}
                  <div>
                    <div className="text-lg font-semibold">
                      {p.name} {p.symbol ? <span className="text-zinc-400 font-normal">{p.symbol}</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">Source: {p.source}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium">{p.outlook_grade ?? "–"}</div>
                  <div className="text-xs text-zinc-400">{p.outlook_score_0_100 === null ? "" : `${Math.round(p.outlook_score_0_100)}/100`}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="text-xs text-zinc-500">Market cap</div>
                  <div className="mt-1 font-medium">{fmtUsd(p.market_cap_usd)}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="text-xs text-zinc-500">24h volume</div>
                  <div className="mt-1 font-medium">{fmtUsd(p.volume_24h_usd)}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="text-xs text-zinc-500">7d</div>
                  <div className={`mt-1 font-medium ${p.price_change_7d_pct !== null && p.price_change_7d_pct < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                    {pct(p.price_change_7d_pct)}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="text-xs text-zinc-500">30d</div>
                  <div className={`mt-1 font-medium ${p.price_change_30d_pct !== null && p.price_change_30d_pct < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                    {pct(p.price_change_30d_pct)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <ScoreMeter score={p.outlook_score_0_100} />
              </div>

              {p.outlook_factors ? (
                <div className="mt-4 text-xs text-zinc-400">
                  Factors: liquidity {p.outlook_factors.liquidity_proxy ?? "–"} / momentum {p.outlook_factors.momentum_proxy ?? "–"} /
                  attention {p.outlook_factors.attention_proxy ?? "–"} / dev {p.outlook_factors.dev_proxy ?? "–"}
                </div>
              ) : null}

              {p.last_seen_at ? <div className="mt-3 text-xs text-zinc-600">Last seen: {new Date(p.last_seen_at).toISOString()}</div> : null}
            </div>
          ))}

          {rows.length === 0 ? <div className="text-zinc-500 text-sm">No projects yet. Run the CoinGecko sync.</div> : null}
        </div>
      </div>
    </main>
  );
}
