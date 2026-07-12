"use client";

import { useState } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import { useWallet } from "@/src/providers/WalletProvider";
import { createEscrow, fundEscrow } from "@/src/lib/stellar/client";
import { xlmToStroops } from "@/src/lib/stellar/format";
import type { AppError } from "@/src/lib/stellar/types";
import { Banner } from "../shared/Banner";

export function EscrowCreator({ onCreated }: { onCreated: (vaultId: number) => void }) {
  const { address, balance } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [mediatorSigner, setMediatorSigner] = useState("");
  const [milestones, setMilestones] = useState<Array<{ amount: string; duration: string }>>([
    { amount: "", duration: "60" },
    { amount: "", duration: "120" },
  ]);
  const [busy, setBusy] = useState<"create" | "fund" | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [step, setStep] = useState<"form" | "created">("form");
  const [vaultId, setVaultId] = useState<number | null>(null);

  function updateMilestone(i: number, key: "amount" | "duration", value: string) {
    setMilestones((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [key]: value } : m))
    );
  }

  function validAddresses(): boolean {
    return StrKey.isValidEd25519PublicKey(recipient) && StrKey.isValidEd25519PublicKey(mediatorSigner);
  }

  const loadDemoPresets = () => {
    setRecipient("GBXTFMY4F5XWMILV3KAQLEG3BQ5OBJNZMNZNX4HR2PGEAE6Y3XV4EXZK");
    setMediatorSigner("GCZIAGXR7VQSAZKWA3LSYNHIL5XW5UXICGQ43YDYYSQHI4AGE45NWBQ3");
    setMilestones([
      { amount: "10", duration: "60" },
      { amount: "20", duration: "120" },
    ]);
  };

  async function handleCreate() {
    setError(null);
    if (!address) {
      setError({ kind: "wallet-not-found", message: "Connect a wallet first." });
      return;
    }
    if (!validAddresses()) {
      setError({
        kind: "not-authorized",
        message: "Beneficiary and Mediator must be valid Stellar public keys (G...).",
      });
      return;
    }
    
    const parsedAmounts = milestones
      .filter((m) => m.amount.trim() !== "")
      .map((m) => xlmToStroops(m.amount));
      
    const parsedDurations = milestones
      .filter((m) => m.amount.trim() !== "")
      .map((m) => BigInt(m.duration.trim() || "0"));

    if (parsedAmounts.length === 0 || parsedAmounts.some((a) => a <= 0n)) {
      setError({
        kind: "not-authorized",
        message: "Every milestone amount must be a positive XLM value.",
      });
      return;
    }

    if (parsedDurations.some((d) => d < 0n)) {
      setError({
        kind: "not-authorized",
        message: "Milestone durations cannot be negative.",
      });
      return;
    }

    const total = parsedAmounts.reduce((a, b) => a + b, 0n);
    const balanceStroops = balance ? xlmToStroops(balance) : 0n;
    if (balanceStroops < total) {
      setError({
        kind: "insufficient-balance",
        message: `This escrow needs ${
          Number(total) / 1e7
        } XLM but the connected wallet only has ${balance ?? "0"} XLM.`,
      });
      return;
    }

    setBusy("create");
    const result = await createEscrow(
      address,
      recipient,
      mediatorSigner,
      parsedAmounts,
      parsedDurations,
    );
    setBusy(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setVaultId(result.vaultId);
    setStep("created");
  }

  async function handleFund() {
    if (!address || vaultId === null) return;
    setBusy("fund");
    setError(null);
    const result = await fundEscrow(address, vaultId);
    setBusy(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onCreated(vaultId);
  }

  if (step === "created" && vaultId !== null) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl">
        <p className="text-sm text-slate-300">
          Escrow <span className="font-bold text-indigo-400">#{vaultId}</span> has been initialized. Lock the milestone capital budget to activate the escrow.
        </p>
        {error && <Banner error={error} onDismiss={() => setError(null)} />}
        <button
          onClick={handleFund}
          disabled={busy === "fund"}
          className="self-start rounded-md bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === "fund" ? "Activating..." : "Fund & Activate Capital"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3.5">
        <div>
          <h2 className="text-base font-bold text-white">
            Initialize Trust Escrow & Stream
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Setup milestone parameters, recipient keys, dispute mediation nodes, and stream vesting rates.
          </p>
        </div>
        <button
          onClick={loadDemoPresets}
          className="rounded border border-indigo-500/20 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
        >
          Load Demo Presets
        </button>
      </div>

      <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
        <span>Beneficiary Address (Recipient)</span>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="G..."
          className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-300">
        <span>Designated Arbiter / Mediator Address</span>
        <input
          value={mediatorSigner}
          onChange={(e) => setMediatorSigner(e.target.value)}
          placeholder="G..."
          className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
        />
      </label>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold text-slate-300">Milestones & Vesting Durations</span>
        {milestones.map((m, i) => (
          <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <span className="w-20 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Milestone {i + 1}</span>
            <div className="flex-1 flex gap-2">
              <input
                value={m.amount}
                onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                placeholder="Amount (XLM)"
                inputMode="decimal"
                className="flex-1 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              <input
                value={m.duration}
                onChange={(e) => updateMilestone(i, "duration", e.target.value)}
                placeholder="Vesting Secs"
                inputMode="numeric"
                className="w-28 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            {milestones.length > 1 && (
              <button
                onClick={() => setMilestones((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-xs text-red-400 hover:text-red-300 transition-colors p-1"
                aria-label="Remove stage"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setMilestones((prev) => [...prev, { amount: "", duration: "60" }])}
          className="self-start text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          + Add Milestone Gate
        </button>
      </div>

      {error && <Banner error={error} onDismiss={() => setError(null)} />}

      <button
        onClick={handleCreate}
        disabled={busy === "create" || !address}
        className="self-start rounded-md bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy === "create" ? "Initializing..." : !address ? "Connect Wallet First" : "Create Escrow"}
      </button>
    </div>
  );
}
