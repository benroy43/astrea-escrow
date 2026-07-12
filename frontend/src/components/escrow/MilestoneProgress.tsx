"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { TrustEscrow, Milestone } from "@/src/lib/stellar/types";
import { formatXlm } from "@/src/lib/stellar/format";

function statusColor(status: Milestone["status"]) {
  if (status === "Released") return "#34D399"; // Emerald 400
  if (status === "Challenged") return "#F59E0B"; // Amber 400
  return "#6366F1"; // Indigo 500
}

function statusLabel(status: Milestone["status"]) {
  if (status === "Released") return "RELEASED";
  if (status === "Challenged") return "CHALLENGED";
  return "SECURED";
}

export function MilestoneProgress({ escrow }: { escrow: TrustEscrow }) {
  const [liveVestedStroops, setLiveVestedStroops] = useState<bigint>(0n);

  const totalStroops = escrow.milestones.reduce((sum, m) => sum + m.tokensAllocated, 0n);
  const totalClaimedStroops = escrow.milestones.reduce((sum, m) => sum + m.claimedAmount, 0n);

  useEffect(() => {
    let active = true;

    function updateTicker() {
      if (!active) return;

      let sumVested = 0n;
      const nowMs = Date.now();

      for (const m of escrow.milestones) {
        if (m.status === "Released") {
          sumVested += m.tokensAllocated;
        } else if (m.status === "Challenged") {
          sumVested += m.claimedAmount; // Claiming is frozen
        } else {
          // status === "ActiveSecured"
          if (m.startTime === 0n) {
            sumVested += 0n;
          } else {
            const startMs = Number(m.startTime) * 1000;
            const elapsedMs = BigInt(Math.max(0, nowMs - startMs));
            const durationMs = BigInt(m.duration) * 1000n;

            if (elapsedMs >= durationMs || durationMs === 0n) {
              sumVested += m.tokensAllocated;
            } else {
              sumVested += (m.tokensAllocated * elapsedMs) / durationMs;
            }
          }
        }
      }

      setLiveVestedStroops(sumVested);
      setTimeout(updateTicker, 50); // Run at 20fps for performance and smooth UI updates
    }

    updateTicker();
    return () => {
      active = false;
    };
  }, [escrow]);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-white/5 bg-slate-900/60 p-6 sm:p-8 shadow-xl backdrop-blur-md">
      {/* Real-time Vesting Ticker Centerpiece */}
      <div className="relative border border-white/5 bg-slate-950/60 rounded-xl p-6 overflow-hidden shadow-lg">
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-mono font-bold">
            On-Chain Clock Synced
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            ACCESSIBLE VESTED CAPITAL
          </span>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-4xl sm:text-5xl font-extrabold text-indigo-400 tracking-tight select-all">
              {formatXlm(liveVestedStroops)}
            </span>
            <span className="text-slate-500 font-bold text-xs sm:text-sm font-mono">
              / {formatXlm(totalStroops)} XLM TOTAL BUDGET
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-400">
          <div>
            <span className="font-bold text-slate-500">Claimed:</span>{" "}
            <span className="font-mono font-medium text-slate-300">{formatXlm(totalClaimedStroops)} XLM</span>
          </div>
          <div>
            <span className="font-bold text-slate-500">Vested Pending Claim:</span>{" "}
            <span className="font-mono font-medium text-indigo-400">
              {formatXlm(liveVestedStroops > totalClaimedStroops ? liveVestedStroops - totalClaimedStroops : 0n)} XLM
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Trail for Desktop */}
      <div className="hidden min-[480px]:block mt-2">
        <div className="relative flex items-start">
          <div
            className="absolute left-0 right-0 top-5 h-[1px]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #334155 0, #334155 8px, transparent 8px, transparent 16px)",
            }}
          />
          {escrow.milestones.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-3">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-950 text-xs font-black shadow-lg transition-all"
                style={{
                  backgroundColor: statusColor(m.status),
                  color: "#0F172A",
                }}
                title={`Milestone ${i + 1}: ${statusLabel(m.status)}`}
              >
                {m.status === "Released" ? "✓" : m.status === "Challenged" ? "!" : i + 1}
              </motion.div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-200">
                  MILESTONE {i + 1}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">
                  {formatXlm(m.tokensAllocated)} XLM
                </span>
                {m.duration > 0n && (
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                    ({Number(m.duration)}s stream)
                  </span>
                )}
                <span
                  className="mt-2 rounded-full px-2.5 py-0.5 text-[8px] font-bold tracking-wider uppercase"
                  style={{
                    backgroundColor: `${statusColor(m.status)}15`,
                    color: statusColor(m.status),
                    border: `1px solid ${statusColor(m.status)}25`,
                  }}
                >
                  {statusLabel(m.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vertical Trail for Mobile */}
      <div className="block min-[480px]:hidden mt-2">
        <div className="relative flex flex-col gap-6 pl-5">
          <div
            className="absolute bottom-2 left-[19px] top-2 w-[1px]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, #334155 0, #334155 8px, transparent 8px, transparent 16px)",
            }}
          />
          {escrow.milestones.map((m, i) => (
            <div key={i} className="relative flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-950 text-xs font-black shadow-lg"
                style={{
                  backgroundColor: statusColor(m.status),
                  color: "#0F172A",
                }}
              >
                {m.status === "Released" ? "✓" : m.status === "Challenged" ? "!" : i + 1}
              </motion.div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-200">
                  MILESTONE {i + 1} — {formatXlm(m.tokensAllocated)} XLM
                </span>
                {m.duration > 0n && (
                  <span className="text-[9px] text-slate-500 font-mono">
                    Stream duration: {Number(m.duration)}s
                  </span>
                )}
                <span
                  className="w-fit rounded-full px-2.5 py-0.5 text-[8px] font-bold tracking-wider uppercase mt-1"
                  style={{
                    backgroundColor: `${statusColor(m.status)}15`,
                    color: statusColor(m.status),
                    border: `1px solid ${statusColor(m.status)}25`,
                  }}
                >
                  {statusLabel(m.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
