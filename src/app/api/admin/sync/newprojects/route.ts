import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";
import { getServerEnv } from "@/lib/env";

export const runtime = "nodejs";

type CmcListing = {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  date_added: string;
  platform?: { name?: string } | null;
  tags?: string[];
};

type CmcInfo = {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  urls?: { website?: string[]; twitter?: string[] };
  platform?: { name?: string } | null;
  tags?: string[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function toXHandleFromUrl(url: string | null): string | null {
  if (!url) return null;
  const u = url.trim();
  const m = u.match(/(?:twitter\.com|x\.com)\/(#!\/)?@?([A-Za-z0-9_]{1,15})/i);
  if (!m) return null;
  return "@" + m[2];
}

async function fetchCmcJson(url: string, apiKey: string) {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-CMC_PRO_API_KEY": apiKey,
      "user-agent": "ON-TRACKER/1.0 (public tracker)",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CoinMarketCap error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function parseSince(s: string): Date {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) throw new Error(`Invalid since date: ${s}`);
  return d;
}

export async function POST(req: Request) {
  const env = getServerEnv();

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== env.INGEST_API_KEY) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cmcKey = env.COINMARKETCAP_API_KEY;
  if (!isNonEmptyString(cmcKey)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing COINMARKETCAP_API_KEY. Add it to Vercel env vars.",
      },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const sinceStr = url.searchParams.get("since") ?? "2026-02-01";
  const maxStr = url.searchParams.get("max") ?? "800";

  const since = parseSince(sinceStr);
  const max = Math.max(1, Math.min(5000, Number(maxStr) || 800));

  // 1) Pull newest listings sorted by date_added desc
  const listingsUrl =
    "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest" +
    "?start=1&limit=5000&sort=date_added&sort_dir=desc&convert=USD";

  const listingsJson = await fetchCmcJson(listingsUrl, cmcKey);
  const listings = (listingsJson?.data ?? []) as CmcListing[];

  const filtered = listings
    .filter((c) => {
      const d = new Date(c.date_added);
      return Number.isFinite(d.getTime()) && d >= since;
    })
    .slice(0, max);

  const ids = filtered.map((c) => c.id);

  // 2) Fetch extra info (website/twitter) in chunks
  const infoById = new Map<number, CmcInfo>();
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const infoUrl =
      "https://pro-api.coinmarketcap.com/v2/cryptocurrency/info" + `?id=${chunk.join(",")}`;
    const infoJson = await fetchCmcJson(infoUrl, cmcKey);
    const obj = (infoJson?.data ?? {}) as Record<string, CmcInfo[]>;
    for (const [idStr, arr] of Object.entries(obj)) {
      const id = Number(idStr);
      const v = Array.isArray(arr) ? arr[0] : null;
      if (v && Number.isFinite(id)) infoById.set(id, v);
    }
  }

  const supabase = supabaseService();

  // Create a task run
  const { data: run, error: runErr } = await supabase
    .from("task_runs")
    .insert({
      task_key: "launches",
      status: "success",
      source: "coinmarketcap",
      notes: `Backfill since ${sinceStr} (max ${max})`,
    })
    .select("id")
    .single();

  if (runErr) return NextResponse.json({ ok: false, error: runErr.message }, { status: 500 });

  const rows = filtered.map((c) => {
    const info = infoById.get(c.id);
    const website = info?.urls?.website?.[0] ?? null;
    const xHandle = toXHandleFromUrl(info?.urls?.twitter?.[0] ?? null);
    const chain = info?.platform?.name ?? c.platform?.name ?? null;

    return {
      name: `${c.name} (${c.symbol})`,
      kind: "token" as const,
      category: chain,
      launch_date: c.date_added,
      launch_window: "since 2026-02-01",
      website,
      x_handle: xHandle,
      notes: `source=coinmarketcap id=${c.id} slug=${c.slug}`,
      run_id: run.id,
    };
  });

  // Insert (best-effort; launch_projects currently has no unique source_id)
  const { error: insErr } = await supabase.from("launch_projects").insert(rows);
  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    source: "coinmarketcap",
    since: sinceStr,
    inserted: rows.length,
    run_id: run.id,
    note: "For de-dupe, add source/source_id columns + unique index (migration recommended).",
  });
}
