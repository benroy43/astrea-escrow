"use client";

import type { AppError } from "@/src/lib/stellar/types";

export function Banner({ error, onDismiss }: { error: AppError; onDismiss?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 shadow-lg backdrop-blur-sm w-full">
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-xs tracking-wider uppercase text-red-400">
          Error: {labelFor(error.kind)}
        </span>
        <p className="text-red-300 text-xs leading-relaxed mt-0.5">{error.message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-red-400 hover:text-red-300 transition-colors text-xs font-bold p-1 leading-none"
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
      return "Wallet Not Installed";
    case "signature-rejected":
      return "Signature Rejected";
    case "insufficient-balance":
      return "Insufficient Network Balance";
    case "not-authorized":
      return "Action Not Authorized";
  }
}
