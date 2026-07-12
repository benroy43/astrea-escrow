"use client";

import { useWallet } from "@/src/providers/WalletProvider";
import { shortAddress } from "@/src/lib/stellar/format";
import { Banner } from "./Banner";

export function WalletButton() {
  const { address, balance, connecting, error, connect, disconnect, clearError } = useWallet();

  return (
    <div className="flex flex-col items-end gap-3">
      {address ? (
        <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-slate-900/60 p-2 sm:p-3 shadow-lg backdrop-blur-md">
          <div className="flex flex-col items-end leading-none gap-1">
            <span className="text-xs font-bold text-slate-100 font-mono">{shortAddress(address)}</span>
            <span className="text-[10px] text-indigo-400 font-mono font-bold">
              {balance !== null ? `${balance} XLM` : "SYNCING..."}
            </span>
          </div>
          <button
            onClick={disconnect}
            className="rounded-md border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-750 hover:text-white transition-all"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="rounded-md bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      {error && <Banner error={error} onDismiss={clearError} />}
    </div>
  );
}
