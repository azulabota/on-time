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
  label,
}: {
  className?: string;
  revealables: Revealable[];
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const splatsRef = useRef<Splat[]>([]);
  const pointerRef = useRef<{ x: number; y: number; active: boolean; pointerType: string }>({ x: 0.5, y: 0.5, active: false, pointerType: "mouse" });
  const paintingRef = useRef<boolean>(false);
  const reduced = useMemo(() => prefersReducedMotion(), []);

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

      // Age out splats (keep MUCH longer — user requested persistent paint)
      const TTL_MS = 30000; // ms
      splatsRef.current = splatsRef.current.filter((s) => t - s.t0 < TTL_MS);

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

      // Revealables (gems/pins) — visibility based on nearby paint
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

      // Draw faint scanning reticle
      const ptr = pointerRef.current;
      if (ptr.active) {
        const px = ptr.x * w;
        const py = ptr.y * h;
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.arc(px, py, 26 * dpr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 10 * dpr, 0, Math.PI * 2);
        ctx.stroke();
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

      // label
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = `${12 * dpr}px ui-sans-serif, system-ui, -apple-system`;
      ctx.fillText(label, 12 * dpr, h - 14 * dpr);
      ctx.restore();

      ctx.restore();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, label]);

  const addSprayAtPointer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = dprRef.current;
    const now = performance.now();
    const px = pointerRef.current.x * canvas.width;
    const py = pointerRef.current.y * canvas.height;

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

    // Desktop: spray on hover. Mobile: only spray while pressing/dragging.
    const isMouse = (e.pointerType || "mouse") === "mouse";
    if (isMouse || paintingRef.current) {
      addSprayAtPointer();
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
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
