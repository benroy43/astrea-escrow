"use client";

import { useWallet } from "@/src/core/hooks/WalletContext";
import { shortAddress } from "@/src/core/utils/format";
import { ErrorBanner } from "../common/ErrorBanner";

export function WalletButton() {
  const { address, balance, connecting, error, connect, disconnect, clearError } = useWallet();

  return (
    <div className="flex flex-col items-end gap-3 font-mono">
      {address ? (
        <div className="flex items-center gap-3 rounded border border-cyber-border bg-cyber-card px-4 py-2">
          <div className="flex flex-col items-end leading-none gap-1">
            <span className="text-xs font-bold text-cyber-lime tracking-wide">{shortAddress(address)}</span>
            <span className="text-[10px] text-cyber-cyan">
              {balance !== null ? `${balance} XLM` : "SYNCING..."}
            </span>
          </div>
          <button
            onClick={disconnect}
            className="rounded border border-cyber-gray-600 bg-cyber-gray-700 px-3 py-1.5 text-[10px] uppercase font-bold text-cyber-gray-400 hover:text-white hover:bg-cyber-gray-600 transition-all"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="rounded border border-cyber-cyan bg-transparent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-cyber-cyan hover:bg-cyber-cyan/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connecting ? "CONNECTING..." : "CONNECT WALLET"}
        </button>
      )}
      {error && <ErrorBanner error={error} onDismiss={clearError} />}
    </div>
  );
}
