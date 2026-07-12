"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import useSWR from "swr";
import { getEscrowCount } from "@/src/lib/stellar/client";

const STEPS = [
  {
    n: "01",
    title: "Configure Escrow Parameters",
    body: "Specify milestone sizes, recipient keys, dispute arbiters, and vesting stream rates. The plan is initialized securely without moving funds.",
  },
  {
    n: "02",
    title: "Fund & Lock Capital",
    body: "Deposit the complete project budget. Capital enters custody as native XLM, triggering stream timers on the ledger.",
  },
  {
    n: "03",
    title: "Stream or Release Funds",
    body: "Beneficiaries claim vested tokens dynamically over time, while project funders retain the authority to disburse milestones instantly.",
  },
  {
    n: "04",
    title: "On-Chain Arbitration",
    body: "If conflict arises, active streams freeze. A designated mediator reviews deliverables and rules to release or lock the capital.",
  },
];

const FEATURES = [
  {
    title: "Linear Asset Streaming",
    body: "Calculates vested amounts dynamically using elapsed ledger block offsets, allowing beneficiaries to withdraw stream yields smoothly.",
  },
  {
    title: "Cross-Contract Interoperability",
    body: "Approvals flow arbiter ➔ escrow ➔ native XLM SAC contract through secure cross-contract invoke chains, fully verified on-chain.",
  },
  {
    title: "Granular Access Security",
    body: "Only the registered mediator contract has execution rights to release milestone balances, preventing direct external breaches.",
  },
  {
    title: "Checked Arithmetic Safety",
    body: "Escrow weights are tracked using Rust i128 stroop precision. Overflow events trigger safe runtime transaction panics.",
  },
];

export default function LandingPage() {
  const [simulatedVesting, setSimulatedVesting] = useState(0);

  // Fetch count for live system stats
  const { data: totalEscrows } = useSWR("escrow-count", getEscrowCount, {
    refreshInterval: 8000,
  });

  useEffect(() => {
    let active = true;
    const startTime = Date.now();
    const durationMs = 120000; // 2 minutes
    const totalAmount = 50.0;

    function tick() {
      if (!active) return;
      const elapsed = Date.now() - startTime;
      const current = Math.min(totalAmount, (totalAmount * elapsed) / durationMs);
      setSimulatedVesting(current);
      requestAnimationFrame(tick);
    }

    tick();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="text-slate-100 min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/5 px-4 py-20 sm:px-8 sm:py-28 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-20">
          <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-500/30 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[130px]" />
        </div>

        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20 shadow-inner">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Soroban Smart Contracts // Testnet Active
          </span>
          <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-6xl tracking-tight max-w-3xl">
            Milestone Gates & <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">Linear Vesting</span> Streams.
          </h1>
          <p className="max-w-2xl text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
            Astraea secures project budgets in smart escrow contracts, unlocking capital milestone by milestone or via linear streaming. If conflicts arise, dedicated arbiters mediate directly on-chain.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <Link
              href="/console"
              className="rounded-md bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-7 py-3.5 text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02]"
            >
              Access Trust Console
            </Link>
            <Link
              href="/escrows"
              className="rounded-md border border-white/10 bg-slate-900/60 text-slate-300 px-7 py-3.5 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all hover:border-indigo-500/30"
            >
              Explore Directory
            </Link>
          </div>
        </div>
      </section>

      {/* Grid Highlights & Live Vesting Ticker Simulator */}
      <section className="px-4 py-8 mx-auto max-w-5xl sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Simulated Ticker Box */}
          <div className="md:col-span-2 rounded-xl border border-white/5 bg-slate-950/60 p-6 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-xl">
            <div className="absolute top-3 right-4 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono font-bold">
                Simulation Live
              </span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                VESTING STREAM TICKER PREVIEW
              </span>
              <div className="mt-4 flex items-baseline gap-2 font-mono">
                <span className="text-4xl font-black text-indigo-400 tracking-tight">
                  {simulatedVesting.toFixed(7)}
                </span>
                <span className="text-slate-500 font-bold text-xs">/ 50.0000000 XLM</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Simulated real-time release based on continuous block ledger progression.
              </p>
            </div>
            <div className="mt-6 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all"
                style={{ width: `${(simulatedVesting / 50.0) * 100}%` }}
              />
            </div>
          </div>

          {/* Network Diagnostics Box */}
          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-6 backdrop-blur-md flex flex-col justify-between shadow-xl">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                PROTOCOL DIAGNOSTICS
              </span>
              <div className="mt-4 flex flex-col gap-2 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>RPC NET:</span>
                  <span className="text-indigo-400 font-bold">TESTNET</span>
                </div>
                <div className="flex justify-between">
                  <span>ESCROWS:</span>
                  <span className="text-slate-200">{totalEscrows !== undefined ? totalEscrows : "..."}</span>
                </div>
                <div className="flex justify-between">
                  <span>STATUS:</span>
                  <span className="text-emerald-400 font-semibold">OPERATIONAL</span>
                </div>
              </div>
            </div>
            <Link
              href="/console"
              className="mt-6 block text-center rounded border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              Verify Ledger State
            </Link>
          </div>
        </div>
      </section>

      {/* Process Pipeline */}
      <section className="px-4 py-16 sm:px-8 mx-auto max-w-5xl">
        <div className="max-w-xl">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
            Escrow Lifecycle Pipeline
          </h2>
          <p className="text-2xl font-bold text-white mt-1.5">
            Automated ledger-enforced capital custody.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, idx) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-lg border border-white/5 bg-slate-900/40 p-6 backdrop-blur-sm shadow-md hover:border-indigo-500/20 transition-all hover:bg-slate-900/60"
            >
              <span className="text-2xl font-black text-indigo-500/20 font-mono block mb-3">
                {s.n}
              </span>
              <h3 className="text-sm font-bold text-slate-100">{s.title}</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-normal">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features & Guarantees */}
      <section className="border-t border-white/5 bg-slate-950/40 px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-xl">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Mathematical & Security Guarantees
            </h2>
            <p className="text-2xl font-bold text-white mt-1.5">
              Verifiable trust mechanisms.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{f.title}</h3>
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed font-normal">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
