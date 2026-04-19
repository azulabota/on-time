"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type SoundCtx = {
  enabled: boolean;
  toggle: () => void;
  click: () => void;
};

const Ctx = createContext<SoundCtx | null>(null);

function safeLocalStorageGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function makeClickPlayer() {
  let ctx: AudioContext | null = null;

  function getCtx() {
    if (ctx) return ctx;
    // @ts-ignore
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  return () => {
    const c = getCtx();
    if (!c) return;

    // Some browsers require user gesture; this is always called from pointerdown.
    if (c.state === "suspended") {
      c.resume().catch(() => {});
    }

    const o = c.createOscillator();
    const g = c.createGain();

    const now = c.currentTime;
    o.type = "triangle";
    o.frequency.setValueAtTime(220, now);
    o.frequency.exponentialRampToValueAtTime(140, now + 0.05);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    o.connect(g);
    g.connect(c.destination);

    o.start(now);
    o.stop(now + 0.07);
  };
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const clickRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const v = safeLocalStorageGet("on_sound_enabled");
    setEnabled(v === "1");
  }, []);

  const click = useMemo(() => {
    if (!clickRef.current) clickRef.current = makeClickPlayer();
    return () => clickRef.current?.();
  }, []);

  const value: SoundCtx = useMemo(
    () => ({
      enabled,
      toggle: () => {
        setEnabled((prev) => {
          const next = !prev;
          safeLocalStorageSet("on_sound_enabled", next ? "1" : "0");
          return next;
        });
      },
      click: () => {
        if (enabled) click();
      },
    }),
    [enabled, click]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSound() {
  const ctx = useContext(Ctx);
  return ctx;
}

export function SoundToggle() {
  const s = useSound();
  if (!s) return null;

  return (
    <button
      type="button"
      onClick={() => s.toggle()}
      className="rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900/50"
      title={s.enabled ? "Sound on" : "Sound off"}
    >
      {s.enabled ? "Sound: ON" : "Sound: OFF"}
    </button>
  );
}
