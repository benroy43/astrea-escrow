"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/src/providers/WalletProvider";
import {
  approveMilestoneRelease,
  contestMilestone,
  resolveDispute,
  claimVestedFunds,
} from "@/src/lib/stellar/client";
import { formatXlm } from "@/src/lib/stellar/format";
import type { AppError, TrustEscrow } from "@/src/lib/stellar/types";
import { Banner } from "../shared/Banner";

export function ControlConsole({
  vaultId,
  escrow,
  onChanged,
}: {
  vaultId: number;
  escrow: TrustEscrow;
  onChanged: () => void;
}) {
  const { address } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [liveClaimable, setLiveClaimable] = useState<bigint>(0n);

  const isFunder = address === escrow.funder;
  const isBeneficiary = address === escrow.beneficiary;

  const milestone = escrow.milestones[stageIndex];

  // Calculate live claimable amount for selected milestone
  useEffect(() => {
    let active = true;

    function updateClaimable() {
      if (!active) return;
      if (!milestone) return;

      if (milestone.status === "Released") {
        setLiveClaimable(0n);
        return;
      }
      if (milestone.status === "Challenged") {
        setLiveClaimable(0n);
        return;
      }

      if (milestone.startTime === 0n) {
        setLiveClaimable(0n);
      } else {
        const nowMs = Date.now();
        const startMs = Number(milestone.startTime) * 1000;
        const elapsedMs = BigInt(Math.max(0, nowMs - startMs));
        const durationMs = BigInt(milestone.duration) * 1000n;

        let vested = 0n;
        if (elapsedMs >= durationMs || durationMs === 0n) {
          vested = milestone.tokensAllocated;
        } else {
          vested = (milestone.tokensAllocated * elapsedMs) / durationMs;
        }

        const claimable = vested > milestone.claimedAmount ? vested - milestone.claimedAmount : 0n;
        setLiveClaimable(claimable);
      }

      setTimeout(updateClaimable, 100);
    }

    updateClaimable();
    return () => {
      active = false;
    };
  }, [milestone]);

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

  if (!milestone) return null;

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl">
      <div>
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2.5 tracking-wide uppercase">
          Adjudication, Release & Claim Controls
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-3">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Select Target Milestone:</span>
          <select
            value={stageIndex}
            onChange={(e) => setStageIndex(Number(e.target.value))}
            className="rounded-md border border-white/10 bg-slate-950 px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
          >
            {escrow.milestones.map((m, i) => (
              <option key={i} value={i} className="bg-slate-900 text-white font-mono">
                Milestone #{i + 1} — [{m.status.toUpperCase()}]
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Claim Display section */}
      {milestone.status === "ActiveSecured" && (
        <div className="rounded-lg bg-indigo-500/10 p-4 border border-indigo-500/20 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
              Claimable Vested Amount
            </span>
            <span className="text-lg font-bold text-indigo-300 font-mono">
              {formatXlm(liveClaimable)} XLM
            </span>
          </div>

          <button
            disabled={busy !== null || liveClaimable <= 0n || !isBeneficiary}
            onClick={() =>
              guardedRun("claim", () => claimVestedFunds(address!, vaultId, stageIndex))
            }
            title={!isBeneficiary ? "Only the beneficiary can claim vested funds" : undefined}
            className="rounded-md bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {busy === "claim" ? "Claiming..." : "Claim Vested"}
          </button>
        </div>
      )}

      {error && <Banner error={error} onDismiss={() => setError(null)} />}

      <div className="flex flex-wrap gap-2.5 mt-2">
        <button
          disabled={busy !== null || milestone.status !== "ActiveSecured" || !isFunder}
          onClick={() =>
            guardedRun("approve", () => approveMilestoneRelease(address!, vaultId, stageIndex))
          }
          title={!isFunder ? "Only the project funder can approve milestone releases" : undefined}
          className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold tracking-wide text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "approve" ? "Approving..." : "Approve Release (Funder)"}
        </button>

        <button
          disabled={busy !== null || milestone.status !== "ActiveSecured" || (!isFunder && !isBeneficiary)}
          onClick={() =>
            guardedRun("dispute", () => contestMilestone(address!, vaultId, stageIndex))
          }
          title={!isFunder && !isBeneficiary ? "Only the funder or beneficiary can open disputes" : undefined}
          className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-bold tracking-wide text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "dispute" ? "Challenging..." : "Dispute Milestone (Funder/Beneficiary)"}
        </button>

        <button
          disabled={busy !== null || milestone.status !== "Challenged"}
          onClick={() =>
            guardedRun("resolve-approve", () =>
              resolveDispute(address!, vaultId, stageIndex, true),
            )
          }
          className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-xs font-bold tracking-wide text-indigo-400 hover:bg-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "resolve-approve" ? "Resolving..." : "Resolve Dispute: Disburse (Arbiter)"}
        </button>

        <button
          disabled={busy !== null || milestone.status !== "Challenged"}
          onClick={() =>
            guardedRun("resolve-reject", () =>
              resolveDispute(address!, vaultId, stageIndex, false),
            )
          }
          className="rounded-md border border-white/10 bg-slate-800 px-4 py-2 text-xs font-bold tracking-wide text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "resolve-reject" ? "Resolving..." : "Resolve Dispute: Lock (Arbiter)"}
        </button>
      </div>

      <p className="text-[10px] text-slate-500 leading-normal mt-1 max-w-lg">
        * Astraea smart contracts enforce access security at the protocol layer. Commands executed by non-authorized accounts will fail transaction simulation check and block gas consumption.
      </p>
    </div>
  );
}
