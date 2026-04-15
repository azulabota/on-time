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
