import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";
import { getServerEnv } from "@/lib/env";
import { computeOutlook } from "@/lib/scoring";

export const runtime = "nodejs";

type CoinGeckoMarketRow = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
  total_volume?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
};

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "OnTime by OnStx/1.0 (public tracker)",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CoinGecko error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function POST(req: Request) {
  const env = getServerEnv();

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== env.INGEST_API_KEY) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const minCap = Number(url.searchParams.get("minCap") ?? "1000000");
  const maxCap = Number(url.searchParams.get("maxCap") ?? "20000000");
  const maxPages = Number(url.searchParams.get("maxPages") ?? "40");

  const supabase = supabaseService();

  const startedAt = Date.now();

  let insertedOrUpdated = 0;
  let kept = 0;
  let scanned = 0;

  for (let page = 1; page <= maxPages; page++) {
    const apiUrl =
      "https://api.coingecko.com/api/v3/coins/markets" +
      `?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}` +
      `&price_change_percentage=7d,30d`;

    const rows = (await fetchJson(apiUrl)) as CoinGeckoMarketRow[];

    if (!rows.length) break;

    scanned += rows.length;

    // Once the last row is below minCap, we can stop paging.
    const lastCap = rows[rows.length - 1]?.market_cap ?? 0;

    const filtered = rows.filter((r) => {
      const mc = r.market_cap ?? null;
      if (mc === null) return false;
      return mc >= minCap && mc <= maxCap;
    });

    kept += filtered.length;

    if (filtered.length) {
      const nowIso = new Date().toISOString();
      const upserts = filtered.map((r) => {
        const outlook = computeOutlook({
          marketCapUsd: r.market_cap ?? null,
          volume24hUsd: r.total_volume ?? null,
          priceChange7dPct: r.price_change_percentage_7d_in_currency ?? null,
          priceChange30dPct: r.price_change_percentage_30d_in_currency ?? null,
          twitterFollowers: null,
          commitCount4w: null,
        });

        return {
          source: "coingecko",
          external_id: r.id,
          symbol: r.symbol?.toUpperCase() ?? null,
          name: r.name,
          image: r.image ?? null,
          market_cap_usd: r.market_cap ?? null,
          volume_24h_usd: r.total_volume ?? null,
          price_usd: r.current_price ?? null,
          price_change_7d_pct: r.price_change_percentage_7d_in_currency ?? null,
          price_change_30d_pct: r.price_change_percentage_30d_in_currency ?? null,
          outlook_score_0_100: outlook.score0to100,
          outlook_grade: outlook.grade,
          outlook_factors: outlook.factors,
          outlook_notes: outlook.notes,
          last_seen_at: nowIso,
          updated_at: nowIso,
        };
      });

      const { error } = await supabase
        .from("project_universe")
        .upsert(upserts, { onConflict: "source,external_id" });

      if (error) throw new Error(error.message);

      insertedOrUpdated += upserts.length;
    }

    if (lastCap < minCap) break;

    // gentle throttle to avoid rate limiting
    await new Promise((r) => setTimeout(r, 700));
  }

  const elapsedMs = Date.now() - startedAt;

  return NextResponse.json({
    ok: true,
    source: "coingecko",
    minCap,
    maxCap,
    scanned,
    kept,
    upserted: insertedOrUpdated,
    elapsedMs,
  });
}
