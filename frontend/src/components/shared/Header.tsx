"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/console", label: "Console" },
  { href: "/escrows", label: "Escrows" },
  { href: "/mediator", label: "Mediator Hub" },
  { href: "/architecture", label: "Architecture" },
  { href: "/faq", label: "FAQ" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            A
          </span>
          <span className="text-lg font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-50 to-slate-200">
            ASTRAEA
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-sm font-medium">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 transition-all text-xs font-bold uppercase tracking-wider ${
                  active
                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
