import Link from "next/link";
import { supabaseAnonSafe } from "@/lib/supabaseClient";
import type { LaunchProject } from "@/lib/types";

export const revalidate = 60;

export default async function LaunchesPage() {
  const supabase = supabaseAnonSafe();

  if (!supabase) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">New projects (twice weekly scan)</h1>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-300">
            This deployment is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </div>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("launch_projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as LaunchProject[];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">New projects (twice weekly scan)</h1>
            <div className="mt-1 text-sm text-zinc-400">
              Includes token launches and product launches.
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
            <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {(p.kind ? `[${p.kind}] ` : "") + (p.category ?? "") + (p.launch_window ? `  ${p.launch_window}` : "") + (p.launch_date ? `  ${p.launch_date}` : "")}
              </div>

              <div className="mt-3 space-y-1 text-sm">
                {p.website ? (
                  <div>
                    Site: <a className="text-sky-400 hover:underline" href={p.website}>{p.website}</a>
                  </div>
                ) : null}
                {p.x_handle ? <div>X: {p.x_handle}</div> : null}
              </div>

              {p.notes ? <div className="mt-3 text-xs text-zinc-400">{p.notes}</div> : null}
              <div className="mt-4 text-xs text-zinc-600">{new Date(p.created_at).toISOString()}</div>
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="text-zinc-500 text-sm">No projects yet.</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
