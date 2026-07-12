"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { getEscrowCount, getEscrow } from "@/src/lib/stellar/client";
import { formatXlm, shortAddress } from "@/src/lib/stellar/format";
import type { TrustEscrow } from "@/src/lib/stellar/types";

export default function EscrowsDirectoryPage() {
  const { data: totalCount, isLoading: countLoading } = useSWR("escrow-count", getEscrowCount, {
    refreshInterval: 12000,
  });

  const [escrows, setEscrows] = useState<Array<{ id: number; data: TrustEscrow }>>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    if (totalCount === undefined) return;
    const count = totalCount;
    
    let active = true;
    async function loadAll() {
      setLoadingList(true);
      const list: Array<{ id: number; data: TrustEscrow }> = [];
      try {
        // Load in reverse order to show the latest escrows first
        for (let i = count - 1; i >= 0; i--) {
          const detail = await getEscrow(i);
          if (detail) {
            list.push({ id: i, data: detail });
          }
        }
        if (active) {
          setEscrows(list);
        }
      } catch (err) {
        console.error("Failed to load escrows directory", err);
      } finally {
        if (active) {
          setLoadingList(false);
        }
      }
    }

    loadAll();
    return () => {
      active = false;
    };
  }, [totalCount]);

  // Compute stats for active vs completed milestones
  const filteredEscrows = escrows.filter(({ data }) => {
    // Search filter
    const matchesSearch =
      data.funder.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data.beneficiary.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    const isCompleted = data.milestones.every((m) => m.status === "Released");
    if (statusFilter === "completed") return isCompleted;
    if (statusFilter === "active") return !isCompleted;
    return true;
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-8 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-6">
        <div className="border-b border-white/5 pb-6">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Escrows Directory</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            Live directory of all initialized staged-settlement escrows and vesting streams. Select any trust vault to review status or manage allocations.
          </p>
        </div>

        {/* Filters and search panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-lg border border-white/5 backdrop-blur-md">
          <div className="flex-1 min-w-[260px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by funder or beneficiary address..."
              className="w-full rounded-md border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "completed"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  statusFilter === filter
                    ? "bg-indigo-600/25 text-indigo-400 border-indigo-500/30"
                    : "text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Loader state */}
        {(countLoading || loadingList) && escrows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest animate-pulse">
              Querying active ledger state...
            </span>
          </div>
        )}

        {/* Empty state */}
        {!countLoading && !loadingList && filteredEscrows.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 p-12 text-center">
            <span className="text-slate-500 text-xs block mb-3 font-semibold">No escrows found matching the filter criteria.</span>
            <Link
              href="/console"
              className="inline-block rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all"
            >
              Initialize First Escrow
            </Link>
          </div>
        )}

        {/* Escrow cards grid */}
        {filteredEscrows.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEscrows.map(({ id, data }) => {
              const totalAllocated = data.milestones.reduce((sum, m) => sum + m.tokensAllocated, 0n);
              const totalClaimed = data.milestones.reduce((sum, m) => sum + m.claimedAmount, 0n);
              const completedCount = data.milestones.filter((m) => m.status === "Released").length;
              const isDisputed = data.milestones.some((m) => m.status === "Challenged");
              const pct = totalAllocated > 0n ? Number((totalClaimed * 100n) / totalAllocated) : 0;

              return (
                <div
                  key={id}
                  className="rounded-xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm flex flex-col justify-between hover:border-indigo-500/20 transition-all group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        VAULT INDEX <span className="text-indigo-400">#{id}</span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${
                          isDisputed
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : completedCount === data.milestones.length
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        }`}
                      >
                        {isDisputed
                          ? "DISPUTED"
                          : completedCount === data.milestones.length
                          ? "COMPLETED"
                          : "ACTIVE"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 text-[11px] text-slate-400 font-mono mb-6">
                      <div className="flex justify-between">
                        <span>Funder:</span>
                        <span className="text-slate-200">{shortAddress(data.funder)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recipient:</span>
                        <span className="text-slate-200">{shortAddress(data.beneficiary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stages:</span>
                        <span className="text-slate-200">
                          {completedCount} / {data.milestones.length} Released
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1.5 font-bold">
                        <span>DISBURSED</span>
                        <span>{pct}% ({formatXlm(totalClaimed)} XLM)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <div className="flex flex-col leading-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Budget</span>
                        <span className="text-sm font-bold text-white font-mono mt-0.5">
                          {formatXlm(totalAllocated)} XLM
                        </span>
                      </div>
                      <Link
                        href={`/console?id=${id}`}
                        className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-[1.02]"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
