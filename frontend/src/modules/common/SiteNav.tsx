"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/architecture", label: "Architecture" },
  { href: "/faq", label: "FAQ" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-cyber-border bg-cyber-bg/90 backdrop-blur sticky top-0 z-50 font-mono">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-cyber-cyan bg-cyber-cyan/10 text-sm font-bold text-cyber-cyan shadow-[0_0_10px_rgba(0,240,255,0.25)]">
            Z
          </span>
          <span className="text-lg font-black tracking-wider text-white">ZENITH</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded px-3 py-2 transition-all uppercase tracking-wider ${
                  active
                    ? "bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30"
                    : "text-cyber-gray-400 hover:text-white hover:bg-cyber-gray-700/50"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/app"
            className={`whitespace-nowrap rounded px-3 py-2 transition-all uppercase tracking-wider ${
              pathname === "/app"
                ? "bg-cyber-cyan text-cyber-bg font-bold border border-cyber-cyan"
                : "border border-cyber-cyan/60 text-cyber-cyan hover:bg-cyber-cyan/15"
            }`}
          >
            Launch Terminal
          </Link>
        </nav>
      </div>
    </header>
  );
}
