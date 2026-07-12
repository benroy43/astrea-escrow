"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { WalletButton } from "@/src/components/shared/WalletButton";
import { EscrowCreator } from "@/src/components/escrow/EscrowCreator";
import { EscrowDetails } from "@/src/components/escrow/EscrowDetails";

function ConsoleInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get("id");

  const [view, setView] = useState<"create" | "view">("view");
  const [focusedId, setFocusedId] = useState<number | null>(null);

  // Sync state if idParam changes
  useEffect(() => {
    if (idParam !== null) {
      const parsed = Number(idParam);
      if (Number.isInteger(parsed) && parsed >= 0) {
        setFocusedId(parsed);
        setView("view");
      }
    }
  }, [idParam]);

  const handleIdChange = (id: number) => {
    setFocusedId(id);
    // Update URL query parameters silently
    router.replace(`/console?id=${id}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Interactive Trust Workspace
          </h2>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed max-w-md">
            Connect Freighter wallet, deploy linear streams, activate escrow gates, and process payouts.
          </p>
        </div>
        <WalletButton />
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setView("view")}
          className={`whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all border ${
            view === "view"
              ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent"
          }`}
        >
          View Active Escrow
        </button>
        <button
          onClick={() => setView("create")}
          className={`whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all border ${
            view === "create"
              ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent"
          }`}
        >
          Initialize New Trust Escrow
        </button>
      </nav>

      {view === "create" ? (
        <EscrowCreator
          onCreated={(id) => {
            handleIdChange(id);
            setView("view");
          }}
        />
      ) : (
        <EscrowDetails initialId={focusedId} onIdChange={handleIdChange} />
      )}
    </div>
  );
}

export default function ConsolePage() {
  return (
    <main className="px-4 py-12 sm:px-8 bg-slate-950/20 min-h-screen">
      <Suspense fallback={
        <div className="mx-auto max-w-3xl flex items-center justify-center h-48">
          <span className="text-xs text-indigo-400 animate-pulse font-bold tracking-widest uppercase">
            Loading Workspace Console...
          </span>
        </div>
      }>
        <ConsoleInner />
      </Suspense>
    </main>
  );
}
