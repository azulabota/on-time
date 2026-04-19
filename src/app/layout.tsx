import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Client background component is dynamically required inside RootLayout to avoid
// Next server/client boundary warnings in some setups.

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ON TRACKER",
  description: "ON TRACKER — $500k–$20M universe, microcaps, and twice-weekly new project scans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Bg = require("@/components/OnGridBackground").default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Sound = require("@/components/sound");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <Sound.SoundProvider>
          {/* Background (interactive grid) */}
          <div className="fixed inset-0 z-0">
            <Bg />
          </div>

          {/* Sound toggle */}
          <div className="fixed right-4 top-4 z-20">
            <Sound.SoundToggle />
          </div>

          <div className="relative z-10 flex-1">{children}</div>

          <footer className="relative z-10 border-t border-zinc-800/80">
          <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between gap-4">
            <div className="text-xs text-zinc-500">
              Built by
              <span className="text-zinc-300"> ON STX</span>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/on-stack-v2/ON-STX-white.svg" alt="ON STX" className="h-7 opacity-90" />
          </div>
          </footer>
        </Sound.SoundProvider>
      </body>
    </html>
  );
}
