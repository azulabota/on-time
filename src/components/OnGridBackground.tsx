"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  cellSize?: number; // px
  className?: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export default function OnGridBackground({ cellSize = 58, className = "" }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setDims({ w, h });
    };

    const onResize = debounce(update, 120);

    update();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { cols, rows, count } = useMemo(() => {
    const w = dims.w || 1200;
    const h = dims.h || 800;

    // +2 padding so edges always look filled
    const cols = clamp(Math.ceil(w / cellSize) + 2, 10, 80);
    const rows = clamp(Math.ceil(h / cellSize) + 2, 8, 70);
    return { cols, rows, count: cols * rows };
  }, [dims.w, dims.h, cellSize]);

  const indices = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  function spawnRipple(ev: React.PointerEvent<HTMLDivElement>) {
    const cell = ev.currentTarget;
    const rect = cell.getBoundingClientRect();

    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    const span = document.createElement("span");
    span.className = "on-ripple";
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;

    cell.appendChild(span);

    span.addEventListener(
      "animationend",
      () => {
        span.remove();
      },
      { once: true }
    );
  }

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`on-grid-host ${className}`}
      style={{
        ["--on-cell-size" as any]: `${cellSize}px`,
        ["--on-cols" as any]: cols,
        ["--on-rows" as any]: rows,
      }}
    >
      <div className="on-grid">
        {indices.map((i) => (
          <div
            key={i}
            className="on-cell"
            onPointerDown={(ev) => {
              // Left click/tap only
              if ((ev as any).button !== undefined && (ev as any).button !== 0) return;
              spawnRipple(ev);
            }}
          />
        ))}
      </div>

      {/* subtle vignette */}
      <div className="on-grid-vignette" />
    </div>
  );
}
