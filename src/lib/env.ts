export type PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

export type ServerEnv = {
  SUPABASE_SERVICE_ROLE_KEY: string;
  INGEST_API_KEY: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function getPublicEnvSafe(): PublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isNonEmptyString(url) || !isNonEmptyString(anon)) return null;
  // minimal sanity check
  if (!/^https?:\/\//.test(url)) return null;
  return { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon };
}

export function getServerEnv(): ServerEnv {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ingest = process.env.INGEST_API_KEY;
  const missing: string[] = [];
  if (!isNonEmptyString(service)) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!isNonEmptyString(ingest) || ingest.length < 16) missing.push("INGEST_API_KEY");
  if (missing.length) {
    throw new Error(`Missing/invalid server env vars: ${missing.join(", ")}`);
  }
  // At this point they're validated as non-empty strings
  return { SUPABASE_SERVICE_ROLE_KEY: service as string, INGEST_API_KEY: ingest as string };
}
