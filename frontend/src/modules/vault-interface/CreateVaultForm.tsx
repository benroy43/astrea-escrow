"use client";

import { useState } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import { useWallet } from "@/src/core/hooks/WalletContext";
import { initializeVault, activateVaultCapital } from "@/src/core/handlers/soroban";
import { xlmToStroops } from "@/src/core/utils/format";
import type { AppError } from "@/src/core/utils/types";
import { ErrorBanner } from "../common/ErrorBanner";

export function CreateVaultForm({ onCreated }: { onCreated: (vaultId: number) => void }) {
  const { address, balance } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [refereeSigner, setRefereeSigner] = useState("");
  const [amounts, setAmounts] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState<"create" | "fund" | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [step, setStep] = useState<"form" | "created">("form");
  const [vaultId, setVaultId] = useState<number | null>(null);

  function updateAmount(i: number, value: string) {
    setAmounts((prev) => prev.map((a, idx) => (idx === i ? value : a)));
  }

  function validAddresses(): boolean {
    return StrKey.isValidEd25519PublicKey(recipient) && StrKey.isValidEd25519PublicKey(refereeSigner);
  }

  async function handleCreate() {
    setError(null);
    if (!address) {
      setError({ kind: "wallet-not-found", message: "Connect a wallet first." });
      return;
    }
    if (!validAddresses()) {
      setError({
        kind: "not-authorized",
        message: "Recipient and dispute referee must be valid Stellar public keys (G...).",
      });
      return;
    }
    const parsedAmounts = amounts.filter((a) => a.trim() !== "").map(xlmToStroops);
    if (parsedAmounts.length === 0 || parsedAmounts.some((a) => a <= 0n)) {
      setError({
        kind: "not-authorized",
        message: "Every stage amount must be a positive XLM value.",
      });
      return;
    }
    const total = parsedAmounts.reduce((a, b) => a + b, 0n);
    const balanceStroops = balance ? xlmToStroops(balance) : 0n;
    if (balanceStroops < total) {
      setError({
        kind: "insufficient-balance",
        message: `This project needs ${
          Number(total) / 1e7
        } XLM but the connected wallet only has ${balance ?? "0"} XLM.`,
      });
      return;
    }

    setBusy("create");
    const result = await initializeVault(address, recipient, refereeSigner, parsedAmounts);
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
    const result = await activateVaultCapital(address, vaultId);
    setBusy(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onCreated(vaultId);
  }

  if (step === "created" && vaultId !== null) {
    return (
      <div className="cyber-panel flex flex-col gap-4 rounded p-6 font-mono">
        <p className="text-xs text-cyber-gray-400">
          VAULT <span className="text-cyber-cyan font-bold">#{vaultId}</span> INITIALIZED SUCCESSFULLY. LOCK THE STAGE BUDGET NOW TO ACTIVATE ITS CAPITAL.
        </p>
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
        <button
          onClick={handleFund}
          disabled={busy === "fund"}
          className="self-start rounded border border-cyber-lime bg-transparent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-cyber-lime hover:bg-cyber-lime/10 hover:shadow-[0_0_15px_rgba(57,255,20,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === "fund" ? "ACTIVATING..." : "ACTIVATE VAULT CAPITAL"}
        </button>
      </div>
    );
  }

  return (
    <div className="cyber-panel flex flex-col gap-5 rounded p-6 font-mono">
      <h2 className="text-sm font-bold uppercase tracking-wider text-cyber-cyan border-b border-cyber-border pb-2">
        {"// DEPLOY STAGED SETTLEMENT VAULT"}
      </h2>

      <label className="flex flex-col gap-1.5 text-xs text-cyber-gray-400">
        <span className="font-bold uppercase tracking-wider">Recipient Address (Beneficiary)</span>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="G..."
          className="rounded border border-cyber-border bg-cyber-gray-900 px-3 py-2 text-cyber-cyan text-xs focus:outline-none focus:border-cyber-cyan transition-all"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs text-cyber-gray-400">
        <span className="font-bold uppercase tracking-wider">Designated Dispute Referee Address</span>
        <input
          value={refereeSigner}
          onChange={(e) => setRefereeSigner(e.target.value)}
          placeholder="G..."
          className="rounded border border-cyber-border bg-cyber-gray-900 px-3 py-2 text-cyber-cyan text-xs focus:outline-none focus:border-cyber-cyan transition-all"
        />
      </label>

      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-cyber-gray-400">Stage Payout Milestones (XLM)</span>
        {amounts.map((a, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-20 text-[10px] text-cyber-gray-500 font-bold uppercase tracking-wider">STAGE {i + 1}</span>
            <input
              value={a}
              onChange={(e) => updateAmount(i, e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              className="flex-1 rounded border border-cyber-border bg-cyber-gray-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-cyan transition-all"
            />
            {amounts.length > 1 && (
              <button
                onClick={() => setAmounts((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-xs text-cyber-pink hover:text-white transition-colors"
                aria-label="Remove stage"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setAmounts((prev) => [...prev, ""])}
          className="self-start text-[10px] font-bold uppercase tracking-wider text-cyber-cyan underline hover:text-white transition-colors"
        >
          + Add Stage Payout
        </button>
      </div>

      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

      <button
        onClick={handleCreate}
        disabled={busy === "create" || !address}
        className="self-start rounded border border-cyber-cyan bg-transparent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-cyber-cyan hover:bg-cyber-cyan/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {busy === "create" ? "CREATING..." : !address ? "CONNECT WALLET FIRST" : "INITIALIZE VAULT"}
      </button>
    </div>
  );
}
