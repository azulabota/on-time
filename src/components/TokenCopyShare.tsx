"use client";

import { useMemo, useState } from "react";
import type { TokenReport } from "@/lib/types";

function norm(s: unknown) {
  return typeof s === "string" ? s.trim() : "";
}

function trimTo(s: string, n: number) {
  const t = norm(s);
  if (t.length <= n) return t;
  return t.slice(0, Math.max(0, n - 1)).trimEnd() + "…";
}

function safeInt(n: unknown) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.round(n);
}

function fmtCategories(cats: unknown) {
  if (!Array.isArray(cats)) return "";
  const xs = cats.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  return xs.join(", ");
}

function buildXPost(t: Pick<
  TokenReport,
  | "symbol"
  | "name"
  | "chain"
  | "contract_address"
  | "categories"
  | "x_handle"
  | "grade"
  | "score_0_100"
  | "summary"
  | "success_projection"
>) {
  const site = "https://ontracker.vercel.app";
  const link = `${site}/microcaps`;

  const sym = norm(t.symbol).toUpperCase();
  const name = norm(t.name);
  const grade = norm(t.grade);
  const score = safeInt(t.score_0_100);

  const chain = norm(t.chain);

  const headline = `${sym}${name ? ` — ${name}` : ""} | ${grade}${score != null ? ` (${score}/100)` : ""}`.trim();

  // We want this to reliably fit X. We'll trim summary/projection to fit.
  // Reserve for fixed lines + link.
  const fixedLines: string[] = [];
  fixedLines.push(headline);
  if (chain) fixedLines.push(`Chain: ${chain}`);

  const baseSummaryPrefix = "Summary: ";
  const baseProjPrefix = "Projection: ";

  // Start with reasonable lengths; then shrink if needed.
  let summaryMax = 130;
  let projMax = 90;

  const build = (sMax: number, pMax: number) => {
    const lines = [...fixedLines];
    const summary = trimTo(norm(t.summary), sMax);
    const proj = trimTo(norm(t.success_projection), pMax);
    if (summary) lines.push(baseSummaryPrefix + summary);
    if (proj) lines.push(baseProjPrefix + proj);
    lines.push(link);
    return lines.join("\n");
  };

  let text = build(summaryMax, projMax);

  // Hard cap to 275 chars to leave room for X quirks.
  while (text.length > 275 && (summaryMax > 40 || projMax > 30)) {
    summaryMax = Math.max(40, summaryMax - 10);
    projMax = Math.max(30, projMax - 8);
    text = build(summaryMax, projMax);
  }

  // If still too long, remove the chain line first.
  if (text.length > 275 && fixedLines.length > 1) {
    const shortFixed = [headline];
    const summary = trimTo(norm(t.summary), 110);
    const proj = trimTo(norm(t.success_projection), 80);
    const lines = [...shortFixed];
    if (summary) lines.push(baseSummaryPrefix + summary);
    if (proj) lines.push(baseProjPrefix + proj);
    lines.push(link);
    text = lines.join("\n");
  }

  // Final clamp.
  if (text.length > 275) text = trimTo(text, 275);

  return text;
}

function buildFullCopy(t: Pick<
  TokenReport,
  | "symbol"
  | "name"
  | "chain"
  | "contract_address"
  | "categories"
  | "x_handle"
  | "grade"
  | "score_0_100"
  | "summary"
  | "success_projection"
  | "created_at"
>) {
  const sym = norm(t.symbol).toUpperCase();
  const name = norm(t.name);
  const chain = norm(t.chain);
  const ca = norm(t.contract_address);
  const cats = fmtCategories(t.categories);
  const xh = norm(t.x_handle);
  const grade = norm(t.grade);
  const score = safeInt(t.score_0_100);
  const created = norm(t.created_at);

  const lines: string[] = [];
  lines.push("ON TRACKER — Microcap Token Research");
  lines.push("");
  lines.push(`Token: ${sym}${name ? ` — ${name}` : ""}`);
  if (chain) lines.push(`Chain: ${chain}`);
  if (ca) lines.push(`Contract: ${ca}`);
  if (cats) lines.push(`Categories: ${cats}`);
  if (xh) lines.push(`X: ${xh}`);
  lines.push(`Grade: ${grade}${score != null ? ` (${score}/100)` : ""}`);
  lines.push("");
  if (norm(t.summary)) {
    lines.push("Summary:");
    lines.push(norm(t.summary));
    lines.push("");
  }
  if (norm(t.success_projection)) {
    lines.push("Success projection:");
    lines.push(norm(t.success_projection));
    lines.push("");
  }
  if (created) lines.push(`As of: ${created}`);
  lines.push("Link: https://ontracker.vercel.app/microcaps");

  return lines.join("\n");
}

export default function TokenCopyShare({ token }: { token: TokenReport }) {
  const xText = useMemo(() => buildXPost(token), [token]);
  const fullText = useMemo(() => buildFullCopy(token), [token]);

  const [copied, setCopied] = useState<null | "x" | "full">(null);

  async function copy(text: string, which: "x" | "full") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      // Fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        setCopied(which);
        setTimeout(() => setCopied(null), 1200);
      } catch {
        setCopied(null);
      }
    }
  }

  function shareToX() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const btnBase =
    "inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/30 px-3 py-1.5 text-[11px] text-zinc-200 hover:bg-zinc-900/50 transition";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button className={btnBase} onClick={() => copy(xText, "x")} type="button">
        {copied === "x" ? "Copied for X" : "Copy for X"}
      </button>
      <button className={btnBase} onClick={shareToX} type="button">
        Share to X
      </button>
      <button className={btnBase} onClick={() => copy(fullText, "full")} type="button">
        {copied === "full" ? "Copied full" : "Copy full"}
      </button>
    </div>
  );
}
