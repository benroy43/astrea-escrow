"use client";

import { motion } from "framer-motion";
import type { VaultStage } from "@/src/core/utils/types";
import { formatXlm } from "@/src/core/utils/format";

function stateColor(state: VaultStage["state"]) {
  if (state === "Disbursed") return "#39ff14"; // Neon Lime
  if (state === "Contested") return "#ff0055"; // Neon Pink
  return "#606575"; // Muted Gray
}

function stateLabel(state: VaultStage["state"]) {
  if (state === "Disbursed") return "DISBURSED";
  if (state === "Contested") return "CONTESTED";
  return "LOCKED";
}

export function StageStepper({ stages }: { stages: VaultStage[] }) {
  const total = stages.reduce((sum, s) => sum + s.amount, 0n);
  const released = stages
    .filter((s) => s.state === "Disbursed")
    .reduce((sum, s) => sum + s.amount, 0n);

  return (
    <div className="cyber-panel rounded p-6 sm:p-8 flex flex-col gap-6">
      {/* Visual Ticker Centerpiece */}
      <div className="relative border border-cyber-border bg-cyber-gray-900/60 rounded p-6 overflow-hidden">
        <div className="absolute top-1 right-2 font-mono text-[8px] text-cyber-gray-600">TICKER::ID_0x7f</div>
        <div className="absolute top-2 left-3 flex gap-1.5 items-center">
          <span className="h-1.5 w-1.5 rounded-full bg-cyber-cyan animate-pulse" />
          <span className="text-[8px] uppercase tracking-widest text-cyber-cyan font-mono">Vault State Sync</span>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyber-gray-500 font-mono">
            CAPITAL RELEASE STATUS
          </span>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-4xl sm:text-5xl font-black text-cyber-lime tracking-tight drop-shadow-[0_0_10px_rgba(57,255,20,0.3)]">
              {formatXlm(released)}
            </span>
            <span className="text-cyber-cyan font-mono text-sm sm:text-base font-semibold">
              / {formatXlm(total)} XLM TOTAL
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal trail (>=480px) */}
      <div className="hidden min-[480px]:block mt-2">
        <div className="relative flex items-start">
          <div
            className="absolute left-0 right-0 top-5 h-[1px]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #303440 0, #303440 8px, transparent 8px, transparent 16px)",
            }}
          />
          {stages.map((s, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-3 font-mono">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 16 }}
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-cyber-bg text-xs font-bold text-cyber-gray-900 shadow-md transition-all duration-300"
                style={{
                  backgroundColor: stateColor(s.state),
                  boxShadow: s.state !== "FundedLocked" ? `0 0 15px ${stateColor(s.state)}` : "none",
                  color: s.state !== "FundedLocked" ? "#08080a" : "#f0f4f8"
                }}
                title={`Stage ${i + 1}: ${stateLabel(s.state)}`}
              >
                {s.state === "Disbursed" ? "✓" : s.state === "Contested" ? "!" : i + 1}
              </motion.div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyber-gray-400">
                  STAGE {i + 1}
                </span>
                <span className="text-[10px] text-cyber-cyan font-bold">{formatXlm(s.amount)} XLM</span>
                <span
                  className="mt-1.5 rounded px-2 py-0.5 text-[8px] font-bold tracking-wider"
                  style={{
                    backgroundColor: `${stateColor(s.state)}15`,
                    color: stateColor(s.state),
                    border: `1px solid ${stateColor(s.state)}30`
                  }}
                >
                  {stateLabel(s.state)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vertical trail (<480px) */}
      <div className="block min-[480px]:hidden mt-2">
        <div className="relative flex flex-col gap-6 pl-5">
          <div
            className="absolute bottom-2 left-[19px] top-2 w-[1px]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, #303440 0, #303440 8px, transparent 8px, transparent 16px)",
            }}
          />
          {stages.map((s, i) => (
            <div key={i} className="relative flex items-center gap-4 font-mono">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyber-bg text-xs font-bold text-cyber-gray-900 shadow-md"
                style={{
                  backgroundColor: stateColor(s.state),
                  boxShadow: s.state !== "FundedLocked" ? `0 0 15px ${stateColor(s.state)}` : "none",
                  color: s.state !== "FundedLocked" ? "#08080a" : "#f0f4f8"
                }}
              >
                {s.state === "Disbursed" ? "✓" : s.state === "Contested" ? "!" : i + 1}
              </motion.div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyber-gray-400">
                  STAGE {i + 1} — {formatXlm(s.amount)} XLM
                </span>
                <span
                  className="w-fit rounded px-2 py-0.5 text-[8px] font-bold tracking-wider"
                  style={{
                    backgroundColor: `${stateColor(s.state)}15`,
                    color: stateColor(s.state),
                    border: `1px solid ${stateColor(s.state)}30`
                  }}
                >
                  {stateLabel(s.state)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
