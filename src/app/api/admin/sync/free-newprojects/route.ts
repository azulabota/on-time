import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";
import { getServerEnv } from "@/lib/env";

export const runtime = "nodejs";

type DexScreenerProfile = {
  url: string;
  chainId: string;
  tokenAddress: string;
  description?: string;
  links?: Array<{ label?: string; url?: string }>;
  updatedAt?: number;
};

type GeckoNewPool = {
  id: string;
  type: "pool";
  attributes: {
    name?: string;
    pool_created_at?: string;
  };
  relationships?: {
    base_token?: { data?: { id: string; type: "token" } };
    quote_token?: { data?: { id: string; type: "token" } };
    dex?: { data?: { id: string; type: "dex" } };
  };
};

type GeckoToken = {
  data: {
    id: string;
    type: "token";
    attributes: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      image_url: string | null;
      coingecko_coin_id: string | null;
    };
  };
};

type LlamaProtocol = {
  id: string;
  name: string;
  url: string | null;
  description?: string;
  category?: string;
  chains?: string[];
  twitter?: string;
  listedAt?: number; // unix seconds
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseSince(s: string): Date {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) throw new Error(`Invalid since date: ${s}`);
  return d;
}

function toIso(d: Date) {
  return d.toISOString();
}

function normAddress(addr: string) {
  return addr.trim().toLowerCase();
}

function toXHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith("@")) return s;
  // Sometimes it comes as a URL
  const m = s.match(/(?:twitter\.com|x\.com)\/(#!\/)?@?([A-Za-z0-9_]{1,15})/i);
  if (m) return "@" + m[2];
  // Sometimes just handle without @
  if (/^[A-Za-z0-9_]{1,15}$/.test(s)) return "@" + s;
  return null;
}

function stableOrBluechip(sym: string) {
  const s = sym.toUpperCase();
  return ["WETH", "ETH", "WBTC", "BTC", "USDC", "USDT", "DAI", "SOL", "BNB"].includes(s);
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "ON-TRACKER/1.0 (free scanner)",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${url} -> ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function insertLaunchRowsBestEffort(rows: any[]) {
  const supabase = supabaseService();

  // Preferred path when the migration is applied:
  // Use upsert + ignoreDuplicates so recurring scans don't error and don't create dupes.
  // Requires: columns (source, source_id, launch_ts) + unique index on (source, source_id).
  const { error: upErr } = await supabase
    .from("launch_projects")
    // @ts-ignore supabase-js supports ignoreDuplicates on upsert
    .upsert(rows, { onConflict: "source,source_id", ignoreDuplicates: true });

  if (!upErr) return { ok: true, mode: "upsert" };

  const msg = (upErr?.message ?? "").toLowerCase();

  // Only fall back to legacy insert when the columns truly don't exist.
  // DO NOT fall back on other errors (it would drop source/source_id and defeat de-dupe).
  const missingColumns =
    msg.includes("column") && (msg.includes("source") || msg.includes("source_id") || msg.includes("launch_ts"));

  if (missingColumns) {
    const compact = rows.map(({ source, source_id, launch_ts, ...rest }) => rest);
    const { error: insErr2 } = await supabase.from("launch_projects").insert(compact);
    if (!insErr2) return { ok: true, mode: "insert-legacy" };
    return { ok: false, error: upErr.message + " | fallback: " + insErr2.message };
  }

  return { ok: false, error: upErr.message };
}

export async function POST(req: Request) {
  const env = getServerEnv();

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== env.INGEST_API_KEY) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sinceStr = url.searchParams.get("since") ?? "2026-02-01";
  const maxPerSource = Math.max(10, Math.min(2000, Number(url.searchParams.get("max") ?? "300") || 300));

  const networksStr = url.searchParams.get("networks") ?? "eth,base,arbitrum,polygon,bsc,solana";
  const maxPages = Math.max(1, Math.min(50, Number(url.searchParams.get("maxPages") ?? "6") || 6));

  const since = parseSince(sinceStr);

  const supabase = supabaseService();

  const { data: run, error: runErr } = await supabase
    .from("task_runs")
    .insert({
      task_key: "launches",
      status: "success",
      source: "free-scanner",
      notes: `free scan since ${sinceStr} (max ${maxPerSource}/source)`,
    })
    .select("id")
    .single();

  if (runErr) return NextResponse.json({ ok: false, error: runErr.message }, { status: 500 });

  const rows: any[] = [];
  const errors: string[] = [];

  // 1) DeFiLlama protocols (product projects)
  try {
    const protos = (await fetchJson("https://api.llama.fi/protocols")) as LlamaProtocol[];
    const filtered = protos
      .filter((p) => typeof p.listedAt === "number" && p.listedAt > 0)
      .filter((p) => new Date((p.listedAt as number) * 1000) >= since)
      .sort((a, b) => (b.listedAt ?? 0) - (a.listedAt ?? 0))
      .slice(0, maxPerSource);

    for (const p of filtered) {
      const launchDate = new Date((p.listedAt as number) * 1000);
      rows.push({
        name: p.name,
        kind: "product",
        category: p.category ?? null,
        launch_date: toIso(launchDate),
        launch_window: `since ${sinceStr}`,
        website: p.url ?? null,
        x_handle: toXHandle(p.twitter),
        notes: (p.description ?? "").slice(0, 450) || null,
        run_id: run.id,
        source: "defillama",
        source_id: `protocol:${p.id}`,
        launch_ts: toIso(launchDate),
      });
    }
  } catch (e: any) {
    errors.push(`defillama: ${e?.message ?? String(e)}`);
  }

  // 2) DexScreener token profiles (token projects)
  try {
    const profs = (await fetchJson("https://api.dexscreener.com/token-profiles/latest/v1")) as DexScreenerProfile[];
    const filtered = profs
      .filter((p) => typeof p.updatedAt === "number" && p.updatedAt > 0)
      .filter((p) => new Date(p.updatedAt as number) >= since)
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, maxPerSource);

    for (const p of filtered) {
      const launchDate = new Date(p.updatedAt as number);
      const website = p.links?.find((l) => (l?.label ?? "").toLowerCase().includes("website"))?.url ??
        p.links?.[0]?.url ??
        null;

      rows.push({
        name: `${p.chainId}:${normAddress(p.tokenAddress)}`,
        kind: "token",
        category: p.chainId,
        launch_date: toIso(launchDate),
        launch_window: `since ${sinceStr}`,
        website: isNonEmptyString(website) ? website : null,
        x_handle: null,
        notes: p.url,
        run_id: run.id,
        source: "dexscreener",
        source_id: `${p.chainId}:${normAddress(p.tokenAddress)}`,
        launch_ts: toIso(launchDate),
      });
    }
  } catch (e: any) {
    errors.push(`dexscreener: ${e?.message ?? String(e)}`);
  }

  // 3) GeckoTerminal new pools (token projects, by first-seen in new pools)
  try {
    const networks = networksStr.split(",").map((s) => s.trim()).filter(Boolean);
    let added = 0;

    for (const net of networks) {
      for (let page = 1; page <= maxPages; page++) {
        const poolsUrl = `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(net)}/new_pools?page=${page}`;
        const poolsJson = await fetchJson(poolsUrl);
        const pools = (poolsJson?.data ?? []) as GeckoNewPool[];
        if (!pools.length) break;

        let allBefore = true;
        for (const pool of pools) {
          const created = pool.attributes?.pool_created_at ? new Date(pool.attributes.pool_created_at) : null;
          if (!created || !Number.isFinite(created.getTime())) continue;

          if (created >= since) allBefore = false;

          if (created < since) continue;

          const baseId = pool.relationships?.base_token?.data?.id;
          if (!baseId) continue;

          const baseAddr = baseId.replace(/^.*_/, "");
          const tokUrl = `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(net)}/tokens/${baseAddr}`;
          const tokJson = (await fetchJson(tokUrl)) as GeckoToken;
          const sym = tokJson?.data?.attributes?.symbol ?? "";
          if (!sym || stableOrBluechip(sym)) continue;

          rows.push({
            name: `${tokJson.data.attributes.name} (${tokJson.data.attributes.symbol})`,
            kind: "token",
            category: net,
            launch_date: toIso(created),
            launch_window: `since ${sinceStr}`,
            website: null,
            x_handle: null,
            notes: `pool=${pool.id}`,
            run_id: run.id,
            source: "geckoterminal",
            source_id: `${net}:${normAddress(tokJson.data.attributes.address)}`,
            launch_ts: toIso(created),
          });

          added += 1;
          if (added >= maxPerSource) break;
        }

        if (added >= maxPerSource) break;
        if (allBefore) break; // pages are newest->older
      }

      if (added >= maxPerSource) break;
    }
  } catch (e: any) {
    errors.push(`geckoterminal: ${e?.message ?? String(e)}`);
  }

  // Trim total rows so we don't slam Supabase
  const finalRows = rows.slice(0, maxPerSource * 3);

  const ins = await insertLaunchRowsBestEffort(finalRows);
  if (!ins.ok) {
    return NextResponse.json({ ok: false, error: ins.error, errors, run_id: run.id }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    since: sinceStr,
    networks: networksStr,
    maxPages,
    inserted: finalRows.length,
    mode: ins.mode,
    run_id: run.id,
    warnings:
      ins.mode === "insert-legacy"
        ? [
            "Supabase launch_projects is missing (source, source_id, launch_ts) columns. Run docs/SUPABASE_MIGRATION_launch_projects_dedupe.sql to enable de-dupe.",
          ]
        : [],
    errors,
  });
}
