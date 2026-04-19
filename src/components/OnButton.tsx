"use client";

import Link from "next/link";
import { useRef } from "react";
import { useSound } from "@/components/sound";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
};

export default function OnButton({ href, children, variant = "primary", className = "" }: Props) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const sound = useSound();

  function spawnRipple(ev: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    const span = document.createElement("span");
    span.className = "on-btn-ripple";
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;

    el.appendChild(span);
    span.addEventListener(
      "animationend",
      () => {
        span.remove();
      },
      { once: true }
    );
  }

  const base =
    "on-btn relative inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-transform duration-150 active:translate-y-[1px]";

  const styles =
    variant === "primary"
      ? "on-btn-primary text-zinc-950"
      : "on-btn-ghost text-zinc-100 border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/55";

  return (
    <Link
      ref={ref}
      href={href}
      onPointerDown={(ev) => {
        // left click / tap only
        // @ts-ignore
        if (ev.button !== undefined && ev.button !== 0) return;
        sound?.click();
        spawnRipple(ev);
      }}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </Link>
  );
}
