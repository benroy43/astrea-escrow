import { VAULT_CONTRACT_ADDRESS, REFEREE_CONTRACT_ADDRESS, STELLAR_NETWORK } from "@/src/core/utils/env";

const NATIVE_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const CONTRACTS = [
  {
    name: "Vault Contract",
    role: "Custody + stage state",
    address: VAULT_CONTRACT_ADDRESS,
    detail:
      "Holds capital funds, stores each project stage's amount and payout state, and is the only place tokens actually move.",
  },
  {
    name: "Referee Contract",
    role: "Approval + dispute adjudication",
    address: REFEREE_CONTRACT_ADDRESS,
    detail:
      "Owns the payout logic: normal approval by the project creator, or dispute resolution by a designated referee key.",
  },
  {
    name: "Native XLM SAC wrapper",
    role: "Settlement asset",
    address: NATIVE_SAC,
    detail: "The Stellar Asset Contract wrapper for native XLM — utilized as the standard settlement currency.",
  },
];

const ERRORS = [
  { code: 1, name: "VaultNotFound", contract: "VaultContract" },
  { code: 2, name: "NoStages", contract: "VaultContract" },
  { code: 3, name: "NonPositiveAmount", contract: "VaultContract" },
  { code: 5, name: "AlreadyActivated", contract: "VaultContract" },
  { code: 6, name: "NotActivated", contract: "VaultContract" },
  { code: 8, name: "AlreadyDisbursed", contract: "VaultContract" },
  { code: 10, name: "NotAuthorized", contract: "VaultContract" },
  { code: 1, name: "NotCreator", contract: "RefereeContract" },
  { code: 2, name: "NotDesignatedReferee", contract: "RefereeContract" },
  { code: 3, name: "InvalidStageState", contract: "RefereeContract" },
];

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8 font-mono">
      <h1 className="text-2xl font-black text-white uppercase tracking-wider">{"// CONTRACT ARCHITECTURE"}</h1>
      <p className="mt-3 text-xs text-cyber-gray-400 font-sans leading-relaxed">
        Three modules, one settlement asset, and exactly one execution path funds can take out of custody.
      </p>

      <div className="cyber-panel mt-10 overflow-x-auto rounded p-6">
        <pre className="whitespace-pre text-xs leading-relaxed text-cyber-cyan">{`
                  +--------------------+
    creator --->  |   vault contract   |  <- holds funds, stage state
                  |  (custody + state) |
                  +---------+----------+
                            | payout_completed_stage (referee-contract-gated)
                            v
                  +--------------------+          +------------------------+
    creator /     |  referee contract  | -------> |  native XLM SAC token  |
    designated -->| (approve/resolve)  |  invoke  |   (transfer)           |
    referee       +--------------------+          +------------------------+
`}</pre>
      </div>

      <h2 className="mt-12 text-sm font-bold text-white uppercase tracking-wider border-b border-cyber-border pb-1">{"// ACTIVE CONTRACTS"} ({STELLAR_NETWORK.toUpperCase()})</h2>
      <div className="mt-4 flex flex-col gap-4">
        {CONTRACTS.map((c) => (
          <div key={c.name} className="cyber-panel rounded p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xs font-bold text-cyber-cyan uppercase">{c.name}</h3>
              <span className="text-[9px] uppercase tracking-wider text-cyber-gray-500 font-bold">{c.role}</span>
            </div>
            <p className="mt-1 text-xs text-cyber-gray-400 font-sans leading-relaxed">{c.detail}</p>
            <a
              href={`https://stellar.expert/explorer/${STELLAR_NETWORK}/contract/${c.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block break-all text-[10px] text-cyber-cyan underline hover:text-white"
            >
              {c.address}
            </a>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-sm font-bold text-white uppercase tracking-wider border-b border-cyber-border pb-1">{"// INTER-CONTRACT CALL SEQUENCE"}</h2>
      <p className="mt-2 text-xs text-cyber-gray-400 font-sans">
        Every payout — normal approval or a resolved dispute — goes through the same real, on-chain sequence:
      </p>
      <ol className="mt-4 flex flex-col gap-3">
        {[
          "referee.approve_stage_payout() or referee.adjudicate_stage_contest(approve: true)",
          "env.invoke_contract -> vault.payout_completed_stage()",
          "vault requires the caller to BE the registered referee contract (require_auth on a contract address)",
          "env.invoke_contract -> native XLM SAC transfer(vault -> recipient, amount)",
        ].map((step, i) => (
          <li key={step} className="flex gap-3 text-xs text-cyber-gray-400">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cyber-cyan text-[10px] font-bold text-cyber-bg">
              {i + 1}
            </span>
            <span className="pt-0.5 font-mono text-[11px]">{step}</span>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-sm font-bold text-white uppercase tracking-wider border-b border-cyber-border pb-1">{"// STAGE STATES"}</h2>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          ["FundedLocked", "#606575", "Default state after funding — capital locked in stage gates."],
          ["Disbursed", "#39ff14", "Successfully paid out to the recipient. Terminal state."],
          ["Contested", "#ff0055", "Flagged due to deliverables conflict. Frozen until referee adjudication."],
        ].map(([label, color, desc]) => (
          <div key={label} className="flex flex-col gap-1 rounded border border-cyber-border p-4 bg-cyber-card">
            <span
              className="w-fit rounded px-2 py-0.5 text-[8px] font-bold tracking-wider text-cyber-bg"
              style={{ backgroundColor: color }}
            >
              {label.toUpperCase()}
            </span>
            <p className="text-[10px] text-cyber-gray-400 font-sans leading-relaxed mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-sm font-bold text-white uppercase tracking-wider border-b border-cyber-border pb-1">{"// EXCEPTION ERROR CODES"}</h2>
      <div className="mt-4 overflow-x-auto rounded border border-cyber-border">
        <table className="w-full text-left text-xs bg-cyber-card">
          <thead className="bg-cyber-gray-900 text-cyber-gray-500 font-bold uppercase tracking-wider border-b border-cyber-border">
            <tr>
              <th className="px-4 py-2">Contract</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
            </tr>
          </thead>
          <tbody className="text-cyber-gray-400 font-mono text-xs">
            {ERRORS.map((e) => (
              <tr key={`${e.contract}-${e.code}`} className="border-b border-cyber-border/40 last:border-none">
                <td className="px-4 py-2 text-cyber-cyan">{e.contract}</td>
                <td className="px-4 py-2 text-cyber-lime">{e.code}</td>
                <td className="px-4 py-2">{e.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
