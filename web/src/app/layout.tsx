import type { Metadata } from "next";
import Link from "next/link";
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
  title: "Poker Bankroll Tracker",
  description: "Track poker sessions, bankroll, and player performance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
            <div className="mx-auto w-full max-w-6xl px-4 py-3 md:px-6">
              <div className="flex items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-2">
                  <span className="text-base font-semibold tracking-tight md:text-lg">
                    Dong Sun Run Tracker
                  </span>
                </Link>
                <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
                  <Link
                    href="/"
                    className="transition-colors hover:text-primary"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/sessions"
                    className="transition-colors hover:text-primary"
                  >
                    Sessions
                  </Link>
                  <Link
                    href="/players"
                    className="transition-colors hover:text-primary"
                  >
                    Players
                  </Link>
                </nav>
              </div>
              {/* Mobile navigation */}
              <nav className="mt-3 flex gap-2 overflow-x-auto text-xs font-medium md:hidden">
                <Link
                  href="/"
                  className="flex-shrink-0 rounded-full border border-border px-3 py-1 transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Dashboard
                </Link>
                <Link
                  href="/sessions"
                  className="flex-shrink-0 rounded-full border border-border px-3 py-1 transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Sessions
                </Link>
                <Link
                  href="/players"
                  className="flex-shrink-0 rounded-full border border-border px-3 py-1 transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Players
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 pb-16 md:pb-0">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
              {children}
            </div>
          </main>
          {/* Mobile bottom tab bar */}
          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur md:hidden">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-around px-4 py-2 text-xs">
              <Link
                href="/"
                className="flex flex-col items-center gap-0.5 text-[11px]"
              >
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link
                href="/sessions"
                className="flex flex-col items-center gap-0.5 text-[11px]"
              >
                <span className="font-medium">Sessions</span>
              </Link>
              <Link
                href="/players"
                className="flex flex-col items-center gap-0.5 text-[11px]"
              >
                <span className="font-medium">Players</span>
              </Link>
            </div>
          </nav>
        </div>
      </body>
    </html>
  );
}
