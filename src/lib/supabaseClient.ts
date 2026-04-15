import { createClient } from "@supabase/supabase-js";
import { getPublicEnvSafe, getServerEnv } from "@/lib/env";

export function supabaseAnonSafe() {
  const env = getPublicEnvSafe();
  if (!env) return null;
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

export function supabaseService() {
  const serverEnv = getServerEnv();
  const publicEnv = getPublicEnvSafe();
  if (!publicEnv) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set");
  }
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
