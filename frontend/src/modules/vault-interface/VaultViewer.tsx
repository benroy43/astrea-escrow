"use client";

import { useState } from "react";
import { useVault } from "@/src/core/hooks/useVault";
import { useWallet } from "@/src/core/hooks/WalletContext";
import { StageStepper } from "./StageStepper";
import { ActionPanel } from "./ActionPanel";
import { shortAddress } from "@/src/core/utils/format";

export function VaultViewer({
  initialId,
  onIdChange,
}: {
  initialId: number | null;
  onIdChange?: (id: number) => void;
}) {
  const [inputId, setInputId] = useState(initialId !== null ? String(initialId) : "");
  const [activeId, setActiveId] = useState<number | null>(initialId);
  const { vault, isLoading, error, refresh } = useVault(activeId);
  const { address } = useWallet();

  function handleLoad() {
    const parsed = Number(inputId);
    if (Number.isInteger(parsed) && parsed >= 0) {
      setActiveId(parsed);
      onIdChange?.(parsed);
    }
  }

  return (
    <div className="flex flex-col gap-6 font-mono">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-xs text-cyber-gray-400">
          <span className="font-bold uppercase tracking-wider">LOAD VAULT BY INDEX</span>
          <input
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            className="w-32 rounded border border-cyber-border bg-cyber-gray-900 px-3 py-2 text-xs text-cyber-cyan focus:outline-none focus:border-cyber-cyan"
          />
        </label>
        <button
          onClick={handleLoad}
          className="rounded border border-cyber-cyan bg-cyber-cyan/10 px-5 py-2 text-xs font-bold uppercase tracking-wider text-cyber-cyan hover:bg-cyber-cyan hover:text-cyber-bg hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
        >
          LOAD
        </button>
      </div>

      {activeId !== null && isLoading && (
        <p className="text-xs text-cyber-cyan animate-pulse">QUERYING LEDGER FOR VAULT STATE #{activeId}...</p>
      )}
      {activeId !== null && !isLoading && !vault && (
        <p className="text-xs text-cyber-pink">
          {error ? `ERROR: ${(error as Error).message}` : `VAULT REPOSITORY MAPPED TO #${activeId} DOES NOT EXIST.`}
        </p>
      )}

      {activeId === null && (
        <div className="flex flex-col gap-6 mt-2">
          {/* Diagnostics Panel */}
          <div className="cyber-panel rounded p-6 relative overflow-hidden">
            <div className="absolute top-1 right-2 text-[8px] text-cyber-gray-600 font-mono">SYS::DIAGNOSTICS_v1.0.8</div>
            <div className="flex gap-2 items-center text-xs text-cyber-cyan font-bold border-b border-cyber-border pb-2.5 mb-4 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-cyan animate-ping" />
              <span>{"// SYSTEM LOGS & DIAGNOSTICS"}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] text-cyber-gray-400 font-mono">
              <div className="flex flex-col gap-2 border-r border-cyber-border/40 pr-4">
                <div className="flex justify-between">
                  <span className="text-cyber-gray-500">RPC NETWORK:</span>
                  <span className="text-cyber-cyan font-bold">STELLAR_TESTNET</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-gray-500">PROTOCOL VER:</span>
                  <span className="text-white">v21.2.0-STABLE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-gray-500">SYSTEM STATUS:</span>
                  <span className="text-cyber-lime font-bold">ONLINE_OPERATIONAL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-gray-500">CUSTODY LEDGER:</span>
                  <span className="text-cyber-cyan">CDLZFC3S...CYSC</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pl-0 sm:pl-4">
                <div className="flex justify-between">
                  <span className="text-cyber-gray-500">LEDGER SYNC:</span>
                  <span className="text-cyber-lime font-bold">100% COMPLETE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-gray-500">OPERATIONAL MODE:</span>
                  <span className="text-cyber-amber font-bold">AWAITING_INPUT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-gray-500">LOCAL GATEWAY:</span>
                  <span className="text-cyber-cyan">FREIGHTER_EXTENSION</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-gray-500">ACTIVE SESSION:</span>
                  <span className="text-white truncate max-w-[120px]">{address ? shortAddress(address) : "UNAUTHORIZED"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Guide Panel */}
          <div className="border border-cyber-border bg-cyber-card/30 rounded p-6">
            <h4 className="text-xs font-bold text-cyber-cyan uppercase tracking-wider mb-3">{"// OPERATOR QUICK-START COMMANDS"}</h4>
            <div className="flex flex-col gap-3 font-sans text-xs text-cyber-gray-400">
              <div className="flex gap-2.5 items-start">
                <span className="text-cyber-cyan font-mono text-[9px] bg-cyber-gray-900 border border-cyber-border px-1.5 py-0.5 rounded leading-none shrink-0">CMD01</span>
                <p>Connect your wallet using the top right button to authenticate signature capability.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="text-cyber-cyan font-mono text-[9px] bg-cyber-gray-900 border border-cyber-border px-1.5 py-0.5 rounded leading-none shrink-0">CMD02</span>
                <p>Query any existing contract by typing its Index (e.g., <span className="font-mono text-cyber-cyan">0</span> or <span className="font-mono text-cyber-cyan">1</span>) and clicking <span className="font-mono font-bold text-white">[LOAD]</span> above.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="text-cyber-cyan font-mono text-[9px] bg-cyber-gray-900 border border-cyber-border px-1.5 py-0.5 rounded leading-none shrink-0">CMD03</span>
                <p>To launch a new project, select <span className="font-mono font-bold text-cyber-cyan">INITIALIZE NEW VAULT</span> from the navigation tabs, define your payout stages, and activate contract capital.</p>
              </div>
            </div>
          </div>

          {/* Scrolling Mock Logs Terminal */}
          <div className="border border-cyber-border bg-cyber-gray-900/40 rounded p-4 font-mono text-[9px] text-cyber-gray-500 flex flex-col gap-1 select-none">
            <div className="flex justify-between border-b border-cyber-border/40 pb-1 mb-1 font-bold text-cyber-gray-600">
              <span>CONSOLE OUTPUT LOGS</span>
              <span>LINES: 04/04</span>
            </div>
            <div>[info] Initializing Soroban RPC Server Connection... [OK]</div>
            <div>[info] Loading contract WASM interfaces... [OK]</div>
            <div>[info] Awaiting authorization handshake... {address ? "[CONNECTED]" : "[NOT_DETECTED]"}</div>
            <div>[ready] System online. Awaiting operator index payload... <span className="animate-pulse">_</span></div>
          </div>
        </div>
      )}

      {vault && (
        <>
          <div className="flex flex-col gap-1 text-[10px] text-cyber-gray-500 uppercase tracking-wide border-l-2 border-cyber-border pl-3">
            <span>
              CREATOR_PUBKEY: <span className="text-cyber-cyan font-bold font-mono">{shortAddress(vault.creator)}</span>
            </span>
            <span>
              RECIPIENT_PUBKEY: <span className="text-cyber-lime font-bold font-mono">{shortAddress(vault.recipient)}</span>
            </span>
          </div>
          <StageStepper stages={vault.stages} />
          <ActionPanel vaultId={activeId!} vault={vault} onChanged={() => refresh()} />
        </>
      )}
    </div>
  );
}
