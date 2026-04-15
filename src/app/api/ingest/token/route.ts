import { getServerEnv } from "@/lib/env";
import { supabaseService } from "@/lib/supabaseClient";

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function POST(req: Request) {
  const env = getServerEnv();

  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== env.INGEST_API_KEY) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const payload = json as Record<string, unknown>;

  const symbol = asString(payload.symbol);
  const grade = asString(payload.grade);
  const summary = asString(payload.summary);
  const success_projection = asString(payload.success_projection);
  const score_0_100 = asNumber(payload.score_0_100);

  if (!symbol || !grade || !summary || !success_projection || score_0_100 === null) {
    return Response.json(
      {
        ok: false,
        error:
          "Missing required fields: symbol, grade, score_0_100 (number), summary, success_projection",
      },
      { status: 400 }
    );
  }

  const supabase = supabaseService();

  const { data: run, error: runErr } = await supabase
    .from("task_runs")
    .insert({
      task_key: "smallcap",
      status: "success",
      source: payload.source ?? "ingest",
      notes: payload.run_notes ?? null,
    })
    .select("id")
    .single();

  if (runErr) return Response.json({ ok: false, error: runErr.message }, { status: 500 });

  const { data: row, error: insErr } = await supabase
    .from("token_reports")
    .insert({
      symbol: payload.symbol,
      name: payload.name ?? null,
      chain: payload.chain ?? null,
      contract_address: payload.contract_address ?? null,
      market_cap_usd: payload.market_cap_usd ?? null,
      fdv_usd: payload.fdv_usd ?? null,
      volume_24h_usd: payload.volume_24h_usd ?? null,
      liquidity_usd: payload.liquidity_usd ?? null,
      grade: payload.grade,
      score_0_100: payload.score_0_100,
      summary: payload.summary,
      success_projection: payload.success_projection,
      run_id: run.id,
    })
    .select("id")
    .single();

  if (insErr) return Response.json({ ok: false, error: insErr.message }, { status: 500 });

  return Response.json({ ok: true, id: row.id, run_id: run.id });
}
