"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Metric = {
  label: string;
  value: string;
  hint: string;
};

export default function Hero() {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);

  // lightweight animation tick to drive a tiny sparkline
  useEffect(() => {
    let start = performance.now();
    const loop = (now: number) => {
      const dt = (now - start) / 1000;
      setT(dt);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const metrics: Metric[] = useMemo(
    () => [
      { label: "Universe", value: "$500k–$20M", hint: "Market cap band" },
      { label: "Signals", value: "Outlook", hint: "Score + grade" },
      { label: "Social", value: "Active", hint: "Followers + activity" },
    ],
    []
  );

  const points = useMemo(() => {
    // generate a stable-ish sparkline that gently moves
    const n = 34;
    const arr: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      const wave = Math.sin(x * 8 + t * 1.2) * 0.22 + Math.sin(x * 2.1 + t * 0.6) * 0.18;
      const bump = Math.exp(-Math.pow((x - 0.72) * 5.2, 2)) * 0.55;
      const y = 0.52 + wave + bump;
      arr.push(Math.max(0.08, Math.min(0.92, y)));
    }
    return arr;
  }, [t]);

  const path = useMemo(() => {
    const w = 520;
    const h = 160;
    const pad = 10;

    const toX = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
    const toY = (v: number) => pad + (1 - v) * (h - pad * 2);

    let d = `M ${toX(0)} ${toY(points[0])}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${toX(i)} ${toY(points[i])}`;
    }
    return { d, w, h };
  }, [points]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 on-hero-glow" />

      <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
        <div className="md:col-span-7">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/on-stack-v2/ON-white.svg" alt="ON" className="h-9 w-9" />
            <div className="text-xs text-zinc-400">ON STX presents</div>
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
            Track microcaps.
            <br />
            Spot new projects.
            <br />
            <span className="on-gradient-text">Move early</span>.
          </h1>

          <p className="mt-4 max-w-xl text-sm text-zinc-300 md:text-base">
            ON TRACKER is a public dashboard for microcap discovery: outlook scoring, socials, categories, and new listings.
            Built to be fast, visual, and fun to explore.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-zinc-800 bg-zinc-900/30 px-4 py-2 text-xs text-zinc-300">
              No login required
            </div>
            <div className="rounded-full border border-zinc-800 bg-zinc-900/30 px-4 py-2 text-xs text-zinc-300">
              De-duped across sources
            </div>
            <div className="rounded-full border border-zinc-800 bg-zinc-900/30 px-4 py-2 text-xs text-zinc-300">
              Built for watchlists (soon)
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
                <div className="text-[11px] text-zinc-400">{m.label}</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">{m.value}</div>
                <div className="mt-1 text-[11px] text-zinc-500">{m.hint}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-400">Live signal preview</div>
              <div className="text-[11px] text-zinc-500">animated</div>
            </div>

            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <svg width="100%" height="160" viewBox={`0 0 ${path.w} ${path.h}`}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00FCC6" stopOpacity="0.95" />
                    <stop offset="55%" stopColor="#F1AB29" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#7248C6" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                <path d={path.d} fill="none" stroke="url(#g)" strokeWidth="3" />
              </svg>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                <div className="text-zinc-500">Outlook</div>
                <div className="mt-1 font-semibold">A–F + 0–100</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
                <div className="text-zinc-500">Social</div>
                <div className="mt-1 font-semibold">Followers + activity</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
