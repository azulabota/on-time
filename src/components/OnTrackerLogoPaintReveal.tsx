"use client";

import { useState } from "react";

export default function OnTrackerLogoPaintReveal({ heightClass = "h-8 md:h-10" }: { heightClass?: string }) {
  const [revealed, setRevealed] = useState(false);

  // Reveal once per page load (replays every visit, not permanently stored)
  const triggerOnce = () => {
    if (revealed) return;
    setRevealed(true);
  };

  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${heightClass}`}
      onPointerEnter={triggerOnce}
      onPointerDown={triggerOnce}
      role="img"
      aria-label="ON TRACKER"
      title="ON TRACKER"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/branding/on-stack-v2/ON-white.svg" alt="ON" className="h-full w-auto" />

      {/* TRACKER: starts hidden; painted on once */}
      <div
        className={`on-logo-paint-wrap ${revealed ? "is-revealed" : ""}`}
        style={{ aspectRatio: "4.36 / 1" }}
        aria-hidden="true"
      >
        {/* Brush swipe */}
        <div className="on-logo-brush" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/on-stack-v2/ON-TRACKER-white.svg"
          alt=""
          className="on-logo-tracker-img"
        />
      </div>
    </div>
  );
}
