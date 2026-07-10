"use client";

import { useState } from "react";
import { useWallet } from "@/src/core/hooks/WalletContext";
import { approveStagePayout, challengeStageDelivery, adjudicateStageContest } from "@/src/core/handlers/soroban";
import type { AppError, PhaseVault } from "@/src/core/utils/types";
import { ErrorBanner } from "../common/ErrorBanner";

export function ActionPanel({
  vaultId,
  vault,
  onChanged,
}: {
  vaultId: number;
  vault: PhaseVault;
  onChanged: () => void;
}) {
  const { address } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  const isCreator = address === vault.creator;
  const isRecipient = address === vault.recipient;
  
  const stage = vault.stages[stageIndex];

  async function guardedRun(kind: string, action: () => Promise<{ ok: true } | { error: AppError }>) {
    setError(null);
    if (!address) {
      setError({ kind: "wallet-not-found", message: "Connect wallet first." });
      return;
    }
    setBusy(kind);
    const result = await action();
    setBusy(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  return (
    <div className="cyber-panel rounded p-6 flex flex-col gap-5 font-mono">
      <h3 className="text-sm font-bold uppercase tracking-wider text-cyber-cyan border-b border-cyber-border pb-2">
        {"// ADJUDICATION & RELEASE CONTROLS"}
      </h3>

      <label className="flex items-center gap-3 text-xs">
        <span className="text-cyber-gray-500 font-bold uppercase tracking-wider">Target Stage:</span>
        <select
          value={stageIndex}
          onChange={(e) => setStageIndex(Number(e.target.value))}
          className="rounded border border-cyber-border bg-cyber-gray-900 px-3 py-1.5 text-cyber-cyan text-xs focus:outline-none focus:border-cyber-cyan font-bold"
        >
          {vault.stages.map((s, i) => (
            <option key={i} value={i} className="bg-cyber-bg">
              STAGE #{i + 1} — [{s.state.toUpperCase()}]
            </option>
          ))}
        </select>
      </label>

      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

      <div className="flex flex-wrap gap-2.5 mt-2">
        <button
          disabled={busy !== null || stage.state !== "FundedLocked" || !isCreator}
          onClick={() =>
            guardedRun("approve", () => approveStagePayout(address!, vaultId, stageIndex))
          }
          title={!isCreator ? "Only the project creator can approve stage payouts" : undefined}
          className="rounded border border-cyber-lime bg-transparent px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-cyber-lime hover:bg-cyber-lime/10 hover:shadow-[0_0_10px_rgba(57,255,20,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {busy === "approve" ? "Approving..." : "Approve Stage Payout (Creator)"}
        </button>

        <button
          disabled={busy !== null || stage.state !== "FundedLocked" || (!isCreator && !isRecipient)}
          onClick={() =>
            guardedRun("dispute", () => challengeStageDelivery(address!, vaultId, stageIndex))
          }
          title={
            !isCreator && !isRecipient
              ? "Only the creator or recipient can raise disputes"
              : undefined
          }
          className="rounded border border-cyber-pink bg-transparent px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-cyber-pink hover:bg-cyber-pink/10 hover:shadow-[0_0_10px_rgba(255,0,85,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {busy === "dispute" ? "Flagging..." : "Mark Contested (Creator/Recipient)"}
        </button>

        <button
          disabled={busy !== null || stage.state !== "Contested"}
          onClick={() =>
            guardedRun("resolve-approve", () =>
              adjudicateStageContest(address!, vaultId, stageIndex, true),
            )
          }
          className="rounded border border-cyber-cyan bg-transparent px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-cyber-cyan hover:bg-cyber-cyan/10 hover:shadow-[0_0_10px_rgba(0,240,255,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {busy === "resolve-approve" ? "Resolving..." : "Resolve: Disburse (Referee)"}
        </button>

        <button
          disabled={busy !== null || stage.state !== "Contested"}
          onClick={() =>
            guardedRun("resolve-reject", () =>
              adjudicateStageContest(address!, vaultId, stageIndex, false),
            )
          }
          className="rounded border border-cyber-gray-600 bg-transparent px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-cyber-gray-400 hover:bg-cyber-gray-600/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {busy === "resolve-reject" ? "Resolving..." : "Resolve: Keep Locked (Referee)"}
        </button>
      </div>

      <p className="text-[10px] text-cyber-gray-500 font-sans mt-1">
        * System access control is strictly enforced on-chain. Operations submitted by unauthorized keypairs will immediately fail simulator checks and return an explicit authorization exception.
      </p>
    </div>
  );
}
