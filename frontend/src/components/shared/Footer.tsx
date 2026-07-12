import { ESCROW_CONTRACT_ADDRESS, ARBITER_CONTRACT_ADDRESS, STELLAR_NETWORK } from "@/src/lib/stellar/env";
import { shortAddress } from "@/src/lib/stellar/format";

export function Footer() {
  const explorerBase = `https://stellar.expert/explorer/${STELLAR_NETWORK}/contract`;

  return (
    <footer className="border-t border-white/5 bg-slate-950/40 text-slate-400">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-xs sm:px-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2.5">
          <div>
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">Escrow Contract: </span>
            <a
              className="underline text-indigo-400 hover:text-indigo-300 transition-colors font-mono"
              href={`${explorerBase}/${ESCROW_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortAddress(ESCROW_CONTRACT_ADDRESS)}
            </a>
          </div>
          <div>
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">Arbiter Contract: </span>
            <a
              className="underline text-indigo-400 hover:text-indigo-300 transition-colors font-mono"
              href={`${explorerBase}/${ARBITER_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortAddress(ARBITER_CONTRACT_ADDRESS)}
            </a>
          </div>
          <div>
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">Network: </span>
            <span className="text-indigo-400 font-semibold uppercase tracking-wider font-mono">{STELLAR_NETWORK}</span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-400 mt-1 max-w-2xl">
          Astraea is a decentralized stage-gated escrow and vesting framework built on Stellar. Funds are held in escrow gates and released linearly over time, while dispute mediation is handled on-chain by authorized arbiters.
        </p>
      </div>
    </footer>
  );
}
