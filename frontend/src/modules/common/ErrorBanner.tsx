"use client";

import type { AppError } from "@/src/core/utils/types";

export function ErrorBanner({ error, onDismiss }: { error: AppError; onDismiss?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded border border-cyber-pink/40 bg-cyber-card px-4 py-3 text-xs font-mono text-cyber-pink shadow-[0_0_15px_rgba(255,0,85,0.15)]">
      <div className="flex flex-col gap-1">
        <span className="font-bold tracking-wider uppercase text-cyber-pink">
          [ERR] // {labelFor(error.kind)}
        </span>
        <p className="text-cyber-gray-400 font-sans text-xs">{error.message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-cyber-pink/70 hover:text-cyber-pink transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function labelFor(kind: AppError["kind"]): string {
  switch (kind) {
    case "wallet-not-found":
      return "WALLET_NOT_FOUND";
    case "signature-rejected":
      return "SIGNATURE_REJECTED";
    case "insufficient-balance":
      return "INSUFFICIENT_BALANCE";
    case "not-authorized":
      return "UNAUTHORIZED_SIGNER";
  }
}
