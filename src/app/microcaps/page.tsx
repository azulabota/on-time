import Link from "next/link";
import { supabaseAnonSafe } from "@/lib/supabaseClient";
import type { TokenReport } from "@/lib/types";

export const revalidate = 60; // keep it fresh

export default async function TokensPage() {
  const supabase = supabaseAnonSafe();

  if (!supabase) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Small-cap token research</h1>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-300">
            This deployment is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </div>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("token_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as TokenReport[];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Small-cap token research</h1>
            <div className="mt-1 text-sm text-zinc-400">
              Grades (A–F) + score (0–100) + realistic success projections.
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
          {rows.map((t) => (
            <div key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">
                    {t.symbol} <span className="text-zinc-400 font-normal">{t.name ?? ""}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {t.chain ?? ""}{t.contract_address ? ` · ${t.contract_address}` : ""}
                  </div>
                  {(t.categories && t.categories.length) || t.x_handle ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      {(t.categories ?? []).slice(0, 5).map((c) => (
                        <span key={c} className="rounded-full border border-zinc-800 bg-zinc-950/30 px-2 py-0.5 text-zinc-300">
                          {c}
                        </span>
                      ))}
                      {t.x_handle ? (
                        <span className="rounded-full border border-zinc-800 bg-zinc-950/30 px-2 py-0.5 text-zinc-500">
                          X: {t.x_handle}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{t.grade}</div>
                  <div className="text-xs text-zinc-400">{Math.round(t.score_0_100)}/100</div>
                </div>
              </div>

              <div className="mt-4 text-sm text-zinc-200">{t.summary}</div>
              <div className="mt-3 text-xs text-zinc-400">Projection: {t.success_projection}</div>

              <div className="mt-4 text-xs text-zinc-600">{new Date(t.created_at).toISOString()}</div>
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="text-zinc-500 text-sm">No token reports yet.</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
