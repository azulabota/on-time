"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSound } from "@/components/sound";

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

export default function OnGridBackground({ cellSize = 8, className = "" }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cellsRef = useRef<Array<HTMLDivElement | null>>([]);
  const lastHotIndexRef = useRef<number | null>(null);
  const sound = useSound();
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

  const { gapPx, padPx } = useMemo(() => {
    // Tuned to look good when cellSize is tiny (user asked ~75% smaller again)
    const gapPx = clamp(Math.round(cellSize * 0.65), 4, 12);
    const padPx = clamp(Math.round(cellSize * 1.25) + 10, 14, 46);
    return { gapPx, padPx };
  }, [cellSize]);

  function spawnRippleAt(cell: HTMLDivElement, clientX: number, clientY: number) {
    const rect = cell.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

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

  function setHotIndex(i: number | null) {
    const prev = lastHotIndexRef.current;
    if (prev != null && cellsRef.current[prev]) {
      cellsRef.current[prev]!.classList.remove("is-hot");
    }
    lastHotIndexRef.current = i;
    if (i != null && cellsRef.current[i]) {
      cellsRef.current[i]!.classList.add("is-hot");
    }
  }

  useEffect(() => {
    // Make the grid feel interactive even though it's behind the app content.
    // We listen globally (capture) and compute which cell is nearest.
    const onMove = (ev: PointerEvent) => {
      const grid = gridRef.current;
      if (!grid) return;

      const rect = grid.getBoundingClientRect();
      const x = ev.clientX;
      const y = ev.clientY;

      // If pointer is nowhere near the grid, don't highlight.
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setHotIndex(null);
        return;
      }

      const cellPitch = cellSize + gapPx;
      const cx = Math.floor((x - rect.left) / cellPitch);
      const cy = Math.floor((y - rect.top) / cellPitch);

      const i = cy * cols + cx;
      if (i < 0 || i >= count) {
        setHotIndex(null);
        return;
      }

      setHotIndex(i);
    };

    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      const i = lastHotIndexRef.current;
      if (i == null) return;
      const cell = cellsRef.current[i];
      if (!cell) return;

      sound?.click();
      spawnRippleAt(cell, ev.clientX, ev.clientY);

      cell.classList.add("is-pressed");
      window.setTimeout(() => cell.classList.remove("is-pressed"), 140);
    };

    window.addEventListener("pointermove", onMove, { capture: true, passive: true });
    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove, { capture: true } as any);
      window.removeEventListener("pointerdown", onDown, { capture: true } as any);
    };
  }, [cellSize, gapPx, cols, count, sound]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`on-grid-host ${className}`}
      style={{
        ["--on-cell-size" as any]: `${cellSize}px`,
        ["--on-cols" as any]: cols,
        ["--on-rows" as any]: rows,
        ["--on-gap" as any]: `${gapPx}px`,
        ["--on-pad" as any]: `${padPx}px`,
      }}
    >
      <div ref={gridRef} className="on-grid">
        {indices.map((i) => (
          <div
            key={i}
            ref={(el) => {
              cellsRef.current[i] = el;
            }}
            className="on-cell"
          />
        ))}
      </div>

      {/* subtle vignette */}
      <div className="on-grid-vignette" />
    </div>
  );
}
