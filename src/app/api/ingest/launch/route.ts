import { getServerEnv } from "@/lib/env";
import { supabaseService } from "@/lib/supabaseClient";

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export async function POST(req: Request) {
  const env = getServerEnv();

  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== env.INGEST_API_KEY) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const payload = json as Record<string, unknown>;

  const name = asString(payload.name);
  if (!name) {
    return Response.json({ ok: false, error: "Missing required field: name" }, { status: 400 });
  }

  const supabase = supabaseService();

  const { data: run, error: runErr } = await supabase
    .from("task_runs")
    .insert({
      task_key: "launches",
      status: "success",
      source: payload.source ?? "ingest",
      notes: payload.run_notes ?? null,
    })
    .select("id")
    .single();

  if (runErr) return Response.json({ ok: false, error: runErr.message }, { status: 500 });

  const { data: row, error: insErr } = await supabase
    .from("launch_projects")
    .insert({
      name: payload.name,
      category: payload.category ?? null,
      launch_date: payload.launch_date ?? null,
      launch_window: payload.launch_window ?? null,
      website: payload.website ?? null,
      x_handle: payload.x_handle ?? null,
      notes: payload.notes ?? null,
      run_id: run.id,
    })
    .select("id")
    .single();

  if (insErr) return Response.json({ ok: false, error: insErr.message }, { status: 500 });

  return Response.json({ ok: true, id: row.id, run_id: run.id });
}
