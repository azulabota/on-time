"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Revealable = {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  kind: "gem" | "pin";
};

type Splat = {
  x: number;
  y: number;
  t0: number;
  r: number;
  color: string;
};

const PALETTE = ["#00fcc6", "#f1ab29", "#7248c6"]; // STX gradient colors

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, glow: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;

  // glow
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;

  // diamond
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.85, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.85, 0);
  ctx.closePath();

  // fill
  const g = ctx.createLinearGradient(-size, -size, size, size);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(1, "rgba(255,255,255,0.55)");
  ctx.fillStyle = g;
  ctx.fill();

  // stroke
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.stroke();

  // facets
  ctx.globalAlpha = alpha * 0.75;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.moveTo(-size * 0.85, 0);
  ctx.lineTo(size * 0.85, 0);
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.stroke();

  ctx.restore();
}

function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;

  ctx.shadowColor = color;
  ctx.shadowBlur = 16;

  // simple map-pin
  ctx.beginPath();
  ctx.arc(0, -size * 0.35, size * 0.55, 0, Math.PI * 2);
  ctx.moveTo(0, size);
  ctx.quadraticCurveTo(size * 0.85, size * 0.1, size * 0.45, -size * 0.25);
  ctx.quadraticCurveTo(0, -size * 1.15, -size * 0.45, -size * 0.25);
  ctx.quadraticCurveTo(-size * 0.85, size * 0.1, 0, size);
  ctx.closePath();

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // inner dot
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(0, -size * 0.35, size * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

export default function SprayRevealTileArt({
  className,
  revealables,
  variant,
}: {
  className?: string;
  revealables: Revealable[];
  // 'gems' = microcap gem hunter
  // 'tracker' = new project tracker
  variant: "gems" | "tracker";
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const splatsRef = useRef<Splat[]>([]);
  const pointerRef = useRef<{ x: number; y: number; active: boolean; pointerType: string }>({ x: 0.5, y: 0.5, active: false, pointerType: "mouse" });
  const paintingRef = useRef<boolean>(false);
  const trailRef = useRef<Array<{ x: number; y: number; t0: number }>>([]);
  const effectivePtrRef = useRef<{ x: number; y: number; active: boolean; locked: boolean; targetId: string | null }>({
    x: 0.5,
    y: 0.5,
    active: false,
    locked: false,
    targetId: null,
  });
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const [activated, setActivated] = useState(false);
  const [found, setFound] = useState<Record<string, number>>({}); // id -> foundAt (ms)

  const dprRef = useRef(1);

  const revealablesPx = useMemo(() => {
    // computed each frame due to resize; placeholder so TS doesn't complain
    return revealables;
  }, [revealables]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      dprRef.current = dpr;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) return; // static in reduced motion

    const tick = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const dpr = dprRef.current;
      const t = now;

      // Effective pointer (adds gem "magnet/lock-on" feel)
      const rawPtr = pointerRef.current;
      let epx = rawPtr.x;
      let epy = rawPtr.y;
      let locked = false;
      let targetId: string | null = null;

      if (variant === "gems" && activated && rawPtr.active) {
        // Find nearest gem revealable
        let bestD2 = Infinity;
        let best: { id: string; x: number; y: number } | null = null;
        for (const it of revealables) {
          if (it.kind !== "gem") continue;
          const dx = it.x - rawPtr.x;
          const dy = it.y - rawPtr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) {
            bestD2 = d2;
            best = it;
          }
        }

        if (best) {
          // Lock radius ~ 12% of the shorter side (in normalized coords)
          const lockR = 0.12;
          const d = Math.sqrt(bestD2);
          if (d < lockR) {
            locked = true;
            targetId = best.id;
            // Stronger pull when closer
            const strength = 0.18 + 0.42 * (1 - d / lockR);
            epx = epx + (best.x - epx) * strength;
            epy = epy + (best.y - epy) * strength;
          }
        }
      }

      effectivePtrRef.current = { x: epx, y: epy, active: rawPtr.active, locked, targetId };

      // Age out splats (keep MUCH longer — user requested persistent paint)
      const TTL_MS = 30000; // ms
      splatsRef.current = splatsRef.current.filter((s) => t - s.t0 < TTL_MS);

      // Age out magnifier trail
      const TRAIL_TTL_MS = 9000;
      trailRef.current = trailRef.current.filter((p) => t - p.t0 < TRAIL_TTL_MS);

      ctx.clearRect(0, 0, w, h);

      // Background tint
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, w, h);

      // Soft fog blobs (scanner mist)
      for (let i = 0; i < 3; i++) {
        const px = (0.15 + i * 0.33 + 0.06 * Math.sin((t / 1200) + i)) * w;
        const py = (0.25 + 0.18 * Math.cos((t / 1500) + i * 1.7)) * h;
        const r = (0.22 + 0.05 * i) * Math.min(w, h);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, "rgba(255,255,255,0.06)");
        grad.addColorStop(1, "rgba(255,255,255,0.0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Paint splats (spray)
      for (const s of splatsRef.current) {
        const age = (t - s.t0) / TTL_MS;
        // Fade very slowly; stays readable for a long time
        const a = (1 - age) * 0.95;
        if (a <= 0) continue;
        const r = s.r;

        // main soft blob
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, s.color.replace(")", "," + (0.22 * a).toFixed(3) + ")").replace("rgb", "rgba"));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();

        // grain
        const grains = 12;
        for (let i = 0; i < grains; i++) {
          const ang = (i / grains) * Math.PI * 2;
          const rr = r * (0.25 + 0.75 * Math.random());
          const gx = s.x + Math.cos(ang) * rr * (0.35 + Math.random() * 0.65);
          const gy = s.y + Math.sin(ang) * rr * (0.35 + Math.random() * 0.65);
          const gr = 1.2 * dpr + Math.random() * 2.4 * dpr;
          ctx.fillStyle = s.color.replace(")", "," + (0.35 * a).toFixed(3) + ")").replace("rgb", "rgba");
          ctx.beginPath();
          ctx.arc(gx, gy, gr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Magnifier trail streak (only when user is actively using gem hunter)
      if (variant === "gems" && activated && trailRef.current.length > 1) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < trailRef.current.length; i++) {
          const a = trailRef.current[i - 1];
          const b = trailRef.current[i];
          const age = (t - b.t0) / 9000;
          const alpha = Math.max(0, 0.18 * (1 - age));
          if (alpha <= 0.001) continue;

          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, `rgba(0,252,198,${alpha})`);
          grad.addColorStop(0.5, `rgba(241,171,41,${alpha})`);
          grad.addColorStop(1, `rgba(114,72,198,${alpha})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 18 * dpr;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // New Project tile: always draw the "dual feed lanes" base (even after activation)
      // so the tile feels clean/organized rather than just abstract mist.
      const drawDualFeedLanes = (alpha: number) => {
        ctx.save();
        ctx.globalAlpha = alpha;

        const pad = 18 * dpr;
        const gutter = 14 * dpr;
        const laneW = (w - pad * 2 - gutter) / 2;
        const laneH = h - pad * 2;
        const xL = pad;
        const xR = pad + laneW + gutter;
        const y0 = pad;

        // lane backplates
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.roundRect(xL, y0, laneW, laneH, 16 * dpr);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(xR, y0, laneW, laneH, 16 * dpr);
        ctx.fill();
        ctx.stroke();

        // headers
        ctx.font = `${10 * dpr}px ui-sans-serif, system-ui, -apple-system`;
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillText("TOKENS", xL + 12 * dpr, y0 + 18 * dpr);
        ctx.fillText("PRODUCTS", xR + 12 * dpr, y0 + 18 * dpr);

        // subtle header underline
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(xL + 10 * dpr, y0 + 26 * dpr);
        ctx.lineTo(xL + laneW - 10 * dpr, y0 + 26 * dpr);
        ctx.moveTo(xR + 10 * dpr, y0 + 26 * dpr);
        ctx.lineTo(xR + laneW - 10 * dpr, y0 + 26 * dpr);
        ctx.stroke();

        const rowTop = y0 + 38 * dpr;
        const rowH = 14 * dpr;
        const gap = 10 * dpr;
        const rowsN = 8;

        const laneDraw = (x: number, speedPx: number, accent: "teal" | "purple") => {
          const cycle = rowH + gap;
          const yShift = ((t / 30) * speedPx) % cycle;

          for (let i = 0; i < rowsN; i++) {
            const y = rowTop + i * cycle - yShift;
            if (y < rowTop - cycle || y > y0 + laneH - 8 * dpr) continue;

            // left icon
            const icx = x + 16 * dpr;
            const icy = y + rowH / 2;
            ctx.fillStyle = "rgba(255,255,255,0.06)";
            ctx.beginPath();
            ctx.arc(icx, icy, 5.2 * dpr, 0, Math.PI * 2);
            ctx.fill();

            const dot = accent === "teal" ? "rgba(0,252,198,0.35)" : "rgba(114,72,198,0.35)";
            ctx.fillStyle = dot;
            ctx.beginPath();
            ctx.arc(icx, icy, 2.3 * dpr, 0, Math.PI * 2);
            ctx.fill();

            // name pill
            const nameW = laneW * (0.44 + 0.30 * ((i % 4) / 4));
            const tagW = laneW * (0.18 + 0.12 * (((i + 2) % 3) / 3));
            const xP = x + 28 * dpr;

            ctx.fillStyle = "rgba(255,255,255,0.055)";
            ctx.strokeStyle = "rgba(255,255,255,0.085)";
            ctx.lineWidth = 1 * dpr;
            ctx.beginPath();
            ctx.roundRect(xP, y, nameW, rowH, 999);
            ctx.fill();
            ctx.stroke();

            // tag pill
            ctx.fillStyle = "rgba(255,255,255,0.045)";
            ctx.strokeStyle = "rgba(255,255,255,0.075)";
            ctx.beginPath();
            ctx.roundRect(xP + nameW + 8 * dpr, y, tagW, rowH, 999);
            ctx.fill();
            ctx.stroke();

            // tiny "NEW" flash on occasional rows
            const flash = 0.5 + 0.5 * Math.sin((t / 240) + i * 0.9 + (accent === "teal" ? 0 : 1.7));
            if (flash > 0.86) {
              ctx.fillStyle = accent === "teal" ? "rgba(0,252,198,0.14)" : "rgba(114,72,198,0.14)";
              ctx.beginPath();
              ctx.roundRect(xP + nameW + tagW - 12 * dpr, y + 2 * dpr, 18 * dpr, rowH - 4 * dpr, 999);
              ctx.fill();
            }
          }

          // gentle shimmer pass
          const sx = x + (0.12 + 0.86 * ((t / 1400) % 1)) * laneW;
          const grad = ctx.createLinearGradient(sx - 36 * dpr, 0, sx + 36 * dpr, 0);
          grad.addColorStop(0, "rgba(255,255,255,0)");
          grad.addColorStop(0.5, accent === "teal" ? "rgba(0,252,198,0.06)" : "rgba(114,72,198,0.06)");
          grad.addColorStop(1, "rgba(255,255,255,0)");

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y0, laneW, laneH, 16 * dpr);
          ctx.clip();
          ctx.fillStyle = grad;
          ctx.fillRect(sx - 40 * dpr, y0, 80 * dpr, laneH);
          ctx.restore();
        };

        laneDraw(xL, 0.030 * h, "teal");
        laneDraw(xR, 0.026 * h, "purple");

        ctx.restore();
      };

      if (variant === "tracker") {
        // Slightly reduced opacity once activated so the revealables/pointer read clearly.
        drawDualFeedLanes(activated ? 0.92 : 1.0);
      }

      // Idle animation (different per tile) until user interacts
      if (!activated) {
        if (variant === "gems") {
          // Magnifier scan idle
          const cx = w * 0.62;
          const cy = h * 0.50;
          const R = Math.min(w, h) * 0.30;

          // lens
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.fillStyle = "rgba(0,0,0,0.10)";
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "rgba(255,255,255,0.16)";
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, Math.PI * 2);
          ctx.stroke();

          // handle
          ctx.translate(cx + R * 0.65, cy + R * 0.65);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = "rgba(255,255,255,0.10)";
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 2 * dpr;
          const hw = R * 0.9;
          const hh = R * 0.22;
          ctx.beginPath();
          ctx.roundRect(0, -hh / 2, hw, hh, hh);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // scan beam sweeping across the lens
          const beam = (0.5 + 0.5 * Math.sin(t / 650)) * 1.2 - 0.1;
          const bx = cx - R + beam * (2 * R);
          const beamW = 18 * dpr;
          const g = ctx.createLinearGradient(bx - beamW, 0, bx + beamW, 0);
          g.addColorStop(0, "rgba(0,252,198,0)");
          g.addColorStop(0.5, "rgba(0,252,198,0.16)");
          g.addColorStop(1, "rgba(241,171,41,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, R - 1 * dpr, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillRect(bx - beamW, cy - R, beamW * 2, R * 2);
          ctx.restore();

          // faint "gems" shimmer points
          const shimmer = 0.4 + 0.6 * Math.sin(t / 480);
          ctx.fillStyle = `rgba(241,171,41,${0.10 + 0.10 * shimmer})`;
          const pts = [
            [w * 0.20, h * 0.34],
            [w * 0.28, h * 0.68],
            [w * 0.44, h * 0.44],
          ];
          for (const [x0, y0] of pts) {
            ctx.beginPath();
            ctx.arc(x0, y0, 2.8 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // subtle hint (no text) — a pulsing dot at bottom-right
        const ph2 = 0.5 + 0.5 * Math.sin(t / 500);
        ctx.fillStyle = `rgba(255,255,255,${0.10 + 0.15 * ph2})`;
        ctx.beginPath();
        ctx.arc(w - 14 * dpr, h - 14 * dpr, 3.3 * dpr, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Revealables (gems/pins)   visibility based on nearby paint
        const computeReveal = (px: number, py: number) => {
          let v = 0;
          for (const s of splatsRef.current) {
            const dx = px - s.x;
            const dy = py - s.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            const influence = 1 - smoothstep(s.r * 0.25, s.r, d);
            v = Math.max(v, influence);
            if (v > 0.98) break;
          }
          return v;
        };

        // Pointer effect (magnifier for gems; reticle for tracker)
        const ptr = effectivePtrRef.current;
        if (ptr.active) {
          const px = ptr.x * w;
          const py = ptr.y * h;

          if (variant === "gems") {
            const R = Math.min(w, h) * 0.16;

            // lens
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "rgba(0,0,0,0.10)";
            ctx.beginPath();
            ctx.arc(px, py, R, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = ptr.locked ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.20)";
            ctx.lineWidth = 2 * dpr;
            ctx.beginPath();
            ctx.arc(px, py, R, 0, Math.PI * 2);
            ctx.stroke();

            // highlight
            const hg = ctx.createRadialGradient(px - R * 0.25, py - R * 0.25, 0, px, py, R);
            hg.addColorStop(0, "rgba(255,255,255,0.10)");
            hg.addColorStop(1, "rgba(255,255,255,0.0)");
            ctx.fillStyle = hg;
            ctx.beginPath();
            ctx.arc(px, py, R, 0, Math.PI * 2);
            ctx.fill();

            // handle
            ctx.strokeStyle = "rgba(255,255,255,0.16)";
            ctx.lineWidth = 5 * dpr;
            ctx.beginPath();
            ctx.moveTo(px + R * 0.65, py + R * 0.65);
            ctx.lineTo(px + R * 1.35, py + R * 1.35);
            ctx.stroke();

            // lock-on pulse ring
            if (ptr.locked) {
              const pulse = 0.5 + 0.5 * Math.sin(t / 170);
              ctx.strokeStyle = `rgba(0,252,198,${0.10 + 0.16 * pulse})`;
              ctx.lineWidth = 2 * dpr;
              ctx.beginPath();
              ctx.arc(px, py, R * (1.08 + 0.06 * pulse), 0, Math.PI * 2);
              ctx.stroke();
            }

            ctx.restore();
          } else {
            ctx.strokeStyle = "rgba(255,255,255,0.12)";
            ctx.lineWidth = 1 * dpr;
            ctx.beginPath();
            ctx.arc(px, py, 26 * dpr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(px, py, 10 * dpr, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        for (const it of revealablesPx) {
          const px = it.x * w;
          const py = it.y * h;
          const base = computeReveal(px, py);
          const a = clamp01(base);
          if (a <= 0.02) continue;

          // mark found when mostly visible
          if (a > 0.92 && found[it.id] == null) {
            setFound((prev) => ({ ...prev, [it.id]: t }));
          }

          const foundAt = found[it.id];
          const pop = foundAt != null ? clamp01(1 - (t - foundAt) / 900) : 0;
          const size = (it.kind === "gem" ? 12 : 11) * dpr * (1 + 0.22 * pop);

          const glow = it.kind === "gem" ? "rgba(0,252,198,0.85)" : "rgba(241,171,41,0.85)";

          if (it.kind === "gem") {
            drawGem(ctx, px, py, size, Math.max(a, 0.12), glow);
          } else {
            drawPin(ctx, px, py, size, Math.max(a, 0.12), "rgba(114,72,198,1)");
          }

          // glint
          if (a > 0.9) {
            ctx.save();
            ctx.globalAlpha = 0.25 * a;
            ctx.strokeStyle = "rgba(255,255,255,0.55)";
            ctx.lineWidth = 1 * dpr;
            ctx.beginPath();
            ctx.moveTo(px - size * 1.3, py);
            ctx.lineTo(px + size * 1.3, py);
            ctx.moveTo(px, py - size * 1.3);
            ctx.lineTo(px, py + size * 1.3);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      ctx.restore();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, activated, found, variant]);

  const addSprayAtPointer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = dprRef.current;
    const now = performance.now();

    const ep = effectivePtrRef.current;
    const px = (ep.active ? ep.x : pointerRef.current.x) * canvas.width;
    const py = (ep.active ? ep.y : pointerRef.current.y) * canvas.height;

    // Add a few splats per tick
    const n = 2;
    for (let i = 0; i < n; i++) {
      const jitter = 10 * dpr;
      const sx = px + (Math.random() - 0.5) * jitter;
      const sy = py + (Math.random() - 0.5) * jitter;
      const r = (18 + Math.random() * 26) * dpr;
      const hex = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const color = `rgb(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)})`;
      splatsRef.current.push({ x: sx, y: sy, t0: now, r, color });
    }

    // cap (higher since paint persists longer)
    if (splatsRef.current.length > 240) splatsRef.current.splice(0, splatsRef.current.length - 240);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    pointerRef.current = { x: clamp01(x), y: clamp01(y), active: true, pointerType: e.pointerType || "mouse" };

    if (reduced) return;

    // Start reveal on first hover/move for mouse users (matches your request)
    const isMouse = (e.pointerType || "mouse") === "mouse";
    if (isMouse) activate();

    // Desktop: spray on hover. Mobile: only spray while pressing/dragging.
    if ((isMouse && activated) || paintingRef.current) {
      addSprayAtPointer();

      // For gem hunter: leave a gradient trail behind the magnifier
      if (variant === "gems") {
        const canvas = canvasRef.current;
        if (canvas) {
          const ep = effectivePtrRef.current;
          const tx = (ep.active ? ep.x : pointerRef.current.x) * canvas.width;
          const ty = (ep.active ? ep.y : pointerRef.current.y) * canvas.height;
          trailRef.current.push({
            x: tx,
            y: ty,
            t0: performance.now(),
          });
          if (trailRef.current.length > 90) trailRef.current.splice(0, trailRef.current.length - 90);
        }
      }
    }
  };

  const revealBurst = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = dprRef.current;
    const now = performance.now();

    const w = canvas.width;
    const h = canvas.height;

    // Big splats around each revealable so it fully uncovers quickly
    for (const it of revealables) {
      const px = it.x * w;
      const py = it.y * h;
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        const off = (14 + Math.random() * 10) * dpr;
        const sx = px + Math.cos(ang) * off;
        const sy = py + Math.sin(ang) * off;
        const r = (42 + Math.random() * 26) * dpr;
        const hex = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        const color = `rgb(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)})`;
        splatsRef.current.push({ x: sx, y: sy, t0: now, r, color });
      }
    }

    // extra wash so the background feels painted
    for (let i = 0; i < 10; i++) {
      const sx = (0.15 + Math.random() * 0.7) * w;
      const sy = (0.2 + Math.random() * 0.6) * h;
      const r = (54 + Math.random() * 42) * dpr;
      const hex = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const color = `rgb(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)})`;
      splatsRef.current.push({ x: sx, y: sy, t0: now, r, color });
    }

    if (splatsRef.current.length > 360) splatsRef.current.splice(0, splatsRef.current.length - 360);
  };

  const activate = () => {
    if (activated) return;
    setActivated(true);
    // Immediately uncover on first interaction
    revealBurst();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    activate();
    paintingRef.current = true;
    onPointerMove(e);
  };

  const onPointerUp = () => {
    paintingRef.current = false;
  };

  const onPointerLeave = () => {
    pointerRef.current.active = false;
    paintingRef.current = false;
  };

  // Reduced motion fallback: render a static hint
  const reducedOverlay = reduced ? (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-1 text-[11px] text-zinc-400">Move cursor to reveal</div>
    </div>
  ) : null;

  return (
    <div className={className + " relative"}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={onPointerMove}
        onPointerLeave={onPointerLeave}
      />
      {reducedOverlay}
    </div>
  );
}
