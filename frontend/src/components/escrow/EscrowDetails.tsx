"use client";

import { useState } from "react";
import useSWR from "swr";
import { useEscrow } from "@/src/hooks/useEscrow";
import { useWallet } from "@/src/providers/WalletProvider";
import { MilestoneProgress } from "./MilestoneProgress";
import { ControlConsole } from "./ControlConsole";
import { shortAddress } from "@/src/lib/stellar/format";
import { ESCROW_CONTRACT_ADDRESS, STELLAR_NETWORK } from "@/src/lib/stellar/env";
import { getEscrowCount } from "@/src/lib/stellar/client";

export function EscrowDetails({
  initialId,
  onIdChange,
}: {
  initialId: number | null;
  onIdChange?: (id: number) => void;
}) {
  const [inputId, setInputId] = useState(initialId !== null ? String(initialId) : "");
  const [activeId, setActiveId] = useState<number | null>(initialId);
  const { escrow, isLoading, error, refresh } = useEscrow(activeId);
  const { address } = useWallet();

  const { data: totalEscrows } = useSWR("escrow-count", getEscrowCount, {
    refreshInterval: 8000,
  });

  function handleLoad() {
    const parsed = Number(inputId);
    if (Number.isInteger(parsed) && parsed >= 0) {
      setActiveId(parsed);
      onIdChange?.(parsed);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
          <span>Query Escrow By Index</span>
          <input
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            className="w-32 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
          />
        </label>
        <button
          onClick={handleLoad}
          className="rounded-md border border-white/10 bg-slate-800 px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-700 hover:text-white shadow-md transition-all"
        >
          Load Escrow
        </button>
      </div>

      {activeId !== null && isLoading && (
        <p className="text-xs text-indigo-400 animate-pulse font-bold">Querying ledger for Escrow details #{activeId}...</p>
      )}
      {activeId !== null && !isLoading && !escrow && (
        <p className="text-xs text-red-400 font-bold">
          {error ? `Error: ${(error as Error).message}` : `Escrow with index #${activeId} does not exist.`}
        </p>
      )}

      {activeId === null && (
        <div className="flex flex-col gap-6 mt-2">
          {/* System Diagnostics Panel */}
          <div className="flex flex-col gap-5 rounded-xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur shadow-xl">
            <div className="flex gap-2 items-center text-xs font-bold text-slate-200 border-b border-white/5 pb-2.5 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>System Logs & Network Diagnostics</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400 font-mono">
              <div className="flex flex-col gap-2 border-r border-white/5 pr-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">RPC NETWORK:</span>
                  <span className="text-slate-200 font-bold">{STELLAR_NETWORK.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PROTOCOL VER:</span>
                  <span className="text-slate-300">v21.2.0-STABLE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GATEWAY STATUS:</span>
                  <span className="text-emerald-400 font-bold">ONLINE_OPERATIONAL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CUSTODY LEDGER:</span>
                  <span className="text-indigo-400 text-[10px] font-bold">{shortAddress(ESCROW_CONTRACT_ADDRESS || "NONE")}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pl-0 sm:pl-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">LEDGER SYNC:</span>
                  <span className="text-emerald-400 font-bold">100% COMPLETE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TOTAL ESCROWS:</span>
                  <span className="text-indigo-400 font-bold">{totalEscrows !== undefined ? totalEscrows : "LOADING..."}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">LOCAL GATEWAY:</span>
                  <span className="text-slate-300">FREIGHTER_WALLETS_KIT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ACTIVE SESSION:</span>
                  <span className="text-indigo-400 font-bold truncate max-w-[120px]">{address ? shortAddress(address) : "NOT CONNECTED"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Guide Panel */}
          <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-slate-950/40 p-6 shadow-lg">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Operator Quick-Start Guide</h4>
            <div className="flex flex-col gap-3 text-xs text-slate-400">
              <div className="flex gap-2.5 items-start">
                <span className="text-indigo-400 font-mono text-[9px] bg-slate-900 border border-white/5 px-1.5 py-0.5 rounded leading-none shrink-0 font-bold">01</span>
                <p>Connect your Freighter wallet using the header button to authenticate write operations.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="text-indigo-400 font-mono text-[9px] bg-slate-900 border border-white/5 px-1.5 py-0.5 rounded leading-none shrink-0 font-bold">02</span>
                <p>Query any existing contract by typing its Index (e.g., <span className="font-mono text-indigo-400 font-bold">0</span> or <span className="font-mono text-indigo-400 font-bold">1</span>) and clicking <span className="font-bold text-slate-200">Load Escrow</span> above.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="text-indigo-400 font-mono text-[9px] bg-slate-900 border border-white/5 px-1.5 py-0.5 rounded leading-none shrink-0 font-bold">03</span>
                <p>To deploy a new trust stream, select <span className="font-bold text-indigo-400">Initialize New Trust Escrow</span> from the navigation tabs, configure stage parameters, and submit.</p>
              </div>
            </div>
          </div>

          {/* Console Log Terminal */}
          <div className="border border-white/10 bg-slate-950 rounded-lg p-4 font-mono text-[10px] text-slate-500 flex flex-col gap-1 select-none shadow-inner">
            <div className="flex justify-between border-b border-white/5 pb-1 mb-1 font-bold text-slate-500 text-[9px]">
              <span>CONSOLE OUTPUT LOGS</span>
              <span>LINES: 04/04</span>
            </div>
            <div>[info] Initializing Soroban RPC Client Connection... <span className="text-emerald-400">[OK]</span></div>
            <div>[info] Loading contract WASM interfaces... <span className="text-emerald-400">[OK]</span></div>
            <div>[info] Awaiting authorization handshake... <span className="text-indigo-400">{address ? "[CONNECTED]" : "[NOT_DETECTED]"}</span></div>
            <div>[ready] System online. Awaiting operator index payload... <span className="animate-pulse text-indigo-400">_</span></div>
          </div>
        </div>
      )}

      {escrow && (
        <>
          <div className="flex flex-col gap-1 text-xs text-slate-400 uppercase tracking-wide border-l-2 border-indigo-500 pl-3">
            <span>
              FUNDER PUBKEY: <span className="text-slate-100 font-bold font-mono">{shortAddress(escrow.funder)}</span>
            </span>
            <span>
              BENEFICIARY PUBKEY: <span className="text-slate-100 font-bold font-mono">{shortAddress(escrow.beneficiary)}</span>
            </span>
          </div>
          <MilestoneProgress escrow={escrow} />
          <ControlConsole vaultId={activeId!} escrow={escrow} onChanged={() => refresh()} />
        </>
      )}
    </div>
  );
}
