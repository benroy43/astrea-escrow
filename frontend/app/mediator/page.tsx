"use client";

import { useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { useWallet } from "@/src/providers/WalletProvider";
import { getEscrowCount, getEscrow, resolveDispute } from "@/src/lib/stellar/client";
import { formatXlm, shortAddress } from "@/src/lib/stellar/format";
import type { TrustEscrow, Milestone, AppError } from "@/src/lib/stellar/types";
import { Banner } from "@/src/components/shared/Banner";

interface DisputedItem {
  vaultId: number;
  escrow: TrustEscrow;
  stageIndex: number;
  milestone: Milestone;
}

export default function MediatorHubPage() {
  const { address } = useWallet();
  const { data: totalCount, isLoading: countLoading } = useSWR("escrow-count", getEscrowCount, {
    refreshInterval: 12000,
  });

  const [disputes, setDisputes] = useState<DisputedItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busyItem, setBusyItem] = useState<{ vaultId: number; stageIndex: number; action: "approve" | "reject" } | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    if (totalCount === undefined || !address) {
      setDisputes([]);
      return;
    }
    setLoadingList(true);
    const list: DisputedItem[] = [];
    try {
      for (let i = 0; i < totalCount; i++) {
        const detail = await getEscrow(i);
        if (detail) {
          // Check if connected address is the designated mediator for this escrow
          const isMediator = detail.mediatorContract.toLowerCase() === address.toLowerCase();
          if (isMediator) {
            // Find any milestones in 'Challenged' status
            detail.milestones.forEach((m, idx) => {
              if (m.status === "Challenged") {
                list.push({
                  vaultId: i,
                  escrow: detail,
                  stageIndex: idx,
                  milestone: m,
                });
              }
            });
          }
        }
      }
      setDisputes(list);
    } catch (err) {
      console.error("Failed to load mediator disputes", err);
    } finally {
      setLoadingList(false);
    }
  }, [totalCount, address]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  async function handleResolve(item: DisputedItem, approve: boolean) {
    if (!address) return;
    setError(null);
    setSuccessMsg(null);
    setBusyItem({
      vaultId: item.vaultId,
      stageIndex: item.stageIndex,
      action: approve ? "approve" : "reject",
    });

    const res = await resolveDispute(address, item.vaultId, item.stageIndex, approve);
    setBusyItem(null);

    if ("error" in res) {
      setError(res.error);
      return;
    }

    setSuccessMsg(
      `Successfully resolved dispute for Escrow #${item.vaultId} Milestone #${item.stageIndex + 1}. Milestone is now ${
        approve ? "Released (Paid)" : "Locked (Capital safe)"
      }.`
    );
    // Reload state
    loadDisputes();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-8 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-6">
        <div className="border-b border-white/5 pb-6">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Mediator Hub</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            Designated on-chain arbitration workspace. Authenticate with your mediator key to review, adjudicate, and resolve challenged project milestones.
          </p>
        </div>

        {error && <Banner error={error} onDismiss={() => setError(null)} />}
        {successMsg && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400 font-semibold shadow-md">
            {successMsg}
          </div>
        )}

        {/* Wallet connection banner if not connected */}
        {!address && (
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6 text-center backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping inline-block mb-3" />
            <h3 className="text-sm font-bold text-white mb-1.5">Arbiter Key Required</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              To inspect disputes and authorize resolutions on the ledger, you must connect your active Stellar Freighter wallet.
            </p>
          </div>
        )}

        {address && (
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-lg border border-white/5 font-mono text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Active Signer Node
            </span>
            <span className="text-indigo-400 font-bold break-all">{address}</span>
          </div>
        )}

        {/* Loading state */}
        {address && (countLoading || loadingList) && disputes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest animate-pulse">
              Scanning ledger for contested gates...
            </span>
          </div>
        )}

        {/* Healthy empty state */}
        {address && !loadingList && disputes.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-slate-900/30 p-12 text-center shadow-lg">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-emerald-400 text-sm font-bold">✓</span>
            </div>
            <h3 className="text-sm font-bold text-white">All Channels Healthy</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              No milestones are currently in the Challenged state for escrows under your mediator key.
            </p>
          </div>
        )}

        {/* Disputes Grid */}
        {address && disputes.length > 0 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Pending Disputes ({disputes.length})
            </h2>
            <div className="grid gap-6">
              {disputes.map((item) => {
                const totalReleased = item.milestone.tokensAllocated;
                const isBusy =
                  busyItem?.vaultId === item.vaultId &&
                  busyItem?.stageIndex === item.stageIndex;

                return (
                  <div
                    key={`${item.vaultId}-${item.stageIndex}`}
                    className="rounded-xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur-md flex flex-col md:flex-row justify-between gap-6 shadow-xl hover:border-amber-500/20 transition-colors"
                  >
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full tracking-wider">
                          DISPUTE VAULT #{item.vaultId}
                        </span>
                        <span className="text-xs text-slate-500 font-mono font-medium">
                          Milestone #{item.stageIndex + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-slate-400">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Funder (Client)</span>
                          <span className="text-slate-200">{shortAddress(item.escrow.funder)}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Beneficiary (Provider)</span>
                          <span className="text-slate-200">{shortAddress(item.escrow.beneficiary)}</span>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contested Amount</span>
                        <span className="text-lg font-bold text-white font-mono">
                          {formatXlm(totalReleased)} XLM
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-end gap-3 min-w-[200px] border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Arbitration Ruling</span>
                      
                      <button
                        disabled={isBusy}
                        onClick={() => handleResolve(item, true)}
                        className="w-full rounded-md bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white py-3 text-xs font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-40 disabled:scale-100 hover:scale-[1.02]"
                      >
                        {isBusy && busyItem?.action === "approve"
                          ? "Disbursing..."
                          : "Disburse Funds to Provider"}
                      </button>

                      <button
                        disabled={isBusy}
                        onClick={() => handleResolve(item, false)}
                        className="w-full rounded-md border border-white/10 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:scale-100 hover:scale-[1.02]"
                      >
                        {isBusy && busyItem?.action === "reject"
                          ? "Locking..."
                          : "Lock Funds in Escrow"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
