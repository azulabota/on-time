export type OutlookInputs = {
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  priceChange7dPct: number | null;
  priceChange30dPct: number | null;

  // Socials
  xFollowers: number | null;
  xActivity7d: number | null;

  commitCount4w: number | null;
};

export type OutlookResult = {
  score0to100: number;
  grade: "A" | "B" | "C" | "D" | "F";
  factors: Record<string, number>;
  notes: string[];
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function safeNum(n: number | null | undefined) {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function logScore(x: number, x0: number, x1: number) {
  // maps x in [x0..x1] roughly into [0..1] using log10
  const a = Math.log10(Math.max(1, x0));
  const b = Math.log10(Math.max(1, x1));
  const v = Math.log10(Math.max(1, x));
  if (b === a) return 0;
  return clamp((v - a) / (b - a), 0, 1);
}

export function gradeFromScore(score0to100: number): OutlookResult["grade"] {
  if (score0to100 >= 85) return "A";
  if (score0to100 >= 70) return "B";
  if (score0to100 >= 55) return "C";
  if (score0to100 >= 40) return "D";
  return "F";
}

export function computeOutlook(inputs: OutlookInputs): OutlookResult {
  const notes: string[] = [];

  const mc = safeNum(inputs.marketCapUsd);
  const vol = safeNum(inputs.volume24hUsd);
  const ch7 = safeNum(inputs.priceChange7dPct);
  const ch30 = safeNum(inputs.priceChange30dPct);
  const xFollowers = safeNum(inputs.xFollowers);
  const xActivity7d = safeNum(inputs.xActivity7d);
  const commits = safeNum(inputs.commitCount4w);

  // Liquidity proxy: volume / market cap
  let liq = 0;
  if (mc && vol && mc > 0) {
    const ratio = vol / mc; // 0.01 = 1% daily turnover
    liq = clamp(ratio / 0.25, 0, 1); // 25% turnover/day => 1.0
  } else {
    notes.push("Missing market cap or volume; liquidity proxy unavailable.");
  }

  // Momentum proxy: average of normalized 7d & 30d
  const mom7 = ch7 === null ? null : clamp((ch7 + 30) / 80, 0, 1); // -30%..+50%
  const mom30 = ch30 === null ? null : clamp((ch30 + 40) / 120, 0, 1); // -40%..+80%
  let mom = 0;
  if (mom7 !== null && mom30 !== null) mom = 0.55 * mom7 + 0.45 * mom30;
  else if (mom7 !== null) mom = mom7;
  else if (mom30 !== null) mom = mom30;
  else notes.push("Missing price change data; momentum proxy unavailable.");

  // Attention proxy: combine X followers + recent activity (both log-scaled)
  const attFollowers = xFollowers === null ? null : logScore(xFollowers, 500, 250000);
  const attActivity = xActivity7d === null ? null : logScore(xActivity7d, 5, 2000);

  let att = 0;
  if (attFollowers !== null && attActivity !== null) att = 0.65 * attFollowers + 0.35 * attActivity;
  else if (attFollowers !== null) att = attFollowers;
  else if (attActivity !== null) att = attActivity;
  else att = 0;

  if (xFollowers === null) notes.push("Missing X followers; attention proxy (followers) unavailable.");
  if (xActivity7d === null) notes.push("Missing X activity; attention proxy (activity) unavailable.");

  // Dev proxy: commits over last 4 weeks (log scale)
  const dev = commits === null ? 0 : logScore(commits, 1, 250);
  if (commits === null) notes.push("Missing recent commits; dev proxy unavailable.");

  // Weighted score (can evolve later)
  // This is intentionally simple and uses only signals we can fetch reliably.
  const wLiq = 0.32;
  const wMom = 0.28;
  const wAtt = 0.22;
  const wDev = 0.18;

  const score = clamp(Math.round(100 * (wLiq * liq + wMom * mom + wAtt * att + wDev * dev)), 0, 100);

  return {
    score0to100: score,
    grade: gradeFromScore(score),
    factors: {
      liquidity_proxy: Math.round(liq * 100),
      momentum_proxy: Math.round(mom * 100),
      attention_proxy: Math.round(att * 100),
      dev_proxy: Math.round(dev * 100),
    },
    notes,
  };
}
