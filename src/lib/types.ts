export type TokenReport = {
  id: number;
  created_at: string;
  symbol: string;
  name: string | null;
  chain: string | null;
  contract_address: string | null;
  market_cap_usd: number | null;
  fdv_usd: number | null;
  volume_24h_usd: number | null;
  liquidity_usd: number | null;
  grade: string;
  score_0_100: number;
  summary: string;
  success_projection: string;
  run_id: number | null;
};

export type LaunchProject = {
  id: number;
  created_at: string;
  name: string;
  category: string | null;
  launch_date: string | null;
  launch_window: string | null;
  website: string | null;
  x_handle: string | null;
  notes: string | null;
  run_id: number | null;
};

export type TaskRun = {
  id: number;
  task_key: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  source: string | null;
  notes: string | null;
};

export type ProjectUniverseItem = {
  id: number;
  created_at: string;
  updated_at: string;

  source: string; // e.g. "coingecko"
  external_id: string; // e.g. coingecko_id

  symbol: string | null;
  name: string;
  image: string | null;

  market_cap_usd: number | null;
  volume_24h_usd: number | null;
  price_usd: number | null;
  price_change_7d_pct: number | null;
  price_change_30d_pct: number | null;

  twitter_followers: number | null;
  commit_count_4w: number | null;

  outlook_score_0_100: number | null;
  outlook_grade: string | null;
  outlook_factors: any | null;
  outlook_notes: string[] | null;

  last_seen_at: string | null;
};
