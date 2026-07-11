"use client";

import { useState } from "react";
import { WalletButton } from "@/src/modules/wallet/WalletButton";
import { CreateVaultForm } from "@/src/modules/vault-interface/CreateVaultForm";
import { VaultViewer } from "@/src/modules/vault-interface/VaultViewer";

export default function AppPage() {
  const [view, setView] = useState<"create" | "view">("view");
  const [focusedId, setFocusedId] = useState<number | null>(null);

  return (
    <main className="px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cyber-border pb-6 font-mono">
          <div>
            <h1 className="text-xl font-black text-white tracking-wider">
              {"// SETTLEMENT VAULTS"}
            </h1>
            <p className="mt-1 text-xs text-cyber-gray-500 font-sans leading-relaxed">
              Initialize stage-gated vaults, activate project capital, and track stage payments live.
            </p>
          </div>
          <WalletButton />
        </div>

        <nav className="flex flex-wrap gap-2 border-b border-cyber-border pb-2 font-mono">
          <button
            onClick={() => setView("view")}
            className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
              view === "view"
                ? "bg-cyber-cyan text-cyber-bg border border-cyber-cyan font-bold"
                : "text-cyber-gray-400 hover:text-white hover:bg-cyber-gray-700/50"
            }`}
          >
            VIEW ACTIVE VAULT
          </button>
          <button
            onClick={() => setView("create")}
            className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
              view === "create"
                ? "bg-cyber-cyan text-cyber-bg border border-cyber-cyan font-bold"
                : "text-cyber-gray-400 hover:text-white hover:bg-cyber-gray-700/50"
            }`}
          >
            INITIALIZE NEW VAULT
          </button>
        </nav>

        {view === "create" ? (
          <CreateVaultForm
            onCreated={(id) => {
              setFocusedId(id);
              setView("view");
            }}
          />
        ) : (
          <VaultViewer initialId={focusedId} onIdChange={setFocusedId} />
        )}
      </div>
    </main>
  );
}
