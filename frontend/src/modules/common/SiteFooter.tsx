import { VAULT_CONTRACT_ADDRESS, REFEREE_CONTRACT_ADDRESS, STELLAR_NETWORK } from "@/src/core/utils/env";
import { shortAddress } from "@/src/core/utils/format";

export function SiteFooter() {
  const explorerBase = `https://stellar.expert/explorer/${STELLAR_NETWORK}/contract`;

  return (
    <footer className="border-t border-cyber-border bg-cyber-bg font-mono">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-[10px] text-cyber-gray-500 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2.5">
          <div>
            <span className="font-bold text-cyber-gray-400 uppercase tracking-wider">Vault: </span>
            <a
              className="underline hover:text-cyber-cyan transition-colors"
              href={`${explorerBase}/${VAULT_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortAddress(VAULT_CONTRACT_ADDRESS)}
            </a>
          </div>
          <div>
            <span className="font-bold text-cyber-gray-400 uppercase tracking-wider">Referee: </span>
            <a
              className="underline hover:text-cyber-cyan transition-colors"
              href={`${explorerBase}/${REFEREE_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortAddress(REFEREE_CONTRACT_ADDRESS)}
            </a>
          </div>
          <div>
            <span className="font-bold text-cyber-gray-400 uppercase tracking-wider">Network: </span>
            <span className="text-cyber-cyan">{STELLAR_NETWORK.toUpperCase()}</span>
          </div>
        </div>
        <p className="font-sans text-[11px] leading-relaxed text-cyber-gray-400 mt-1 max-w-2xl">
          Zenith is a premium decentralized staged-settlement framework deployed on Soroban. Funds are locked securely in stage gates, while dispute resolutions are adjudicated by designated referee signers transparently on-chain.
        </p>
      </div>
    </footer>
  );
}
