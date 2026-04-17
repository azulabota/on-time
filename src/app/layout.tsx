import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OnTime",
  description: "OnTime 1M20M universe, microcaps, and twice-weekly new project scans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <div className="flex-1">{children}</div>

        <footer className="border-t border-zinc-800/80">
          <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between gap-4">
            <div className="text-xs text-zinc-500">
              Built by
              <span className="text-zinc-300"> OnStx</span>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/onstx.svg" alt="OnStx" className="h-7 opacity-90" />
          </div>
        </footer>
      </body>
    </html>
  );
}
