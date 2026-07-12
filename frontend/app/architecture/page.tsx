import { ESCROW_CONTRACT_ADDRESS, ARBITER_CONTRACT_ADDRESS, STELLAR_NETWORK } from "@/src/lib/stellar/env";

const NATIVE_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const CONTRACTS = [
  {
    name: "Astraea Escrow",
    role: "Custody + linear vesting + milestone states",
    address: ESCROW_CONTRACT_ADDRESS,
    detail:
      "Holds capital funds, stores each milestone's amount, stream rate, and state. Handles dynamic clock-based vesting and transfers funds to the beneficiary.",
  },
  {
    name: "Astraea Arbiter",
    role: "Release authorization + dispute mediation",
    address: ARBITER_CONTRACT_ADDRESS,
    detail:
      "Controls release triggers: creator-driven milestone approvals or mediator-driven dispute arbitration on contested stages.",
  },
  {
    name: "Native XLM SAC wrapper",
    role: "Settlement asset",
    address: NATIVE_SAC,
    detail: "The Stellar Asset Contract wrapper for native XLM — utilized as the standard settlement currency.",
  },
];

const ERRORS = [
  { code: 1, name: "EscrowNotFound", contract: "AstraeaEscrow" },
  { code: 2, name: "NoStages", contract: "AstraeaEscrow" },
  { code: 3, name: "NonPositiveAmount", contract: "AstraeaEscrow" },
  { code: 5, name: "AlreadyActivated", contract: "AstraeaEscrow" },
  { code: 6, name: "NotActivated", contract: "AstraeaEscrow" },
  { code: 8, name: "AlreadyReleased", contract: "AstraeaEscrow" },
  { code: 10, name: "NotAuthorized", contract: "AstraeaEscrow" },
  { code: 12, name: "Challenged", contract: "AstraeaEscrow" },
  { code: 1, name: "NotFunder", contract: "AstraeaArbiter" },
  { code: 2, name: "NotDesignatedMediator", contract: "AstraeaArbiter" },
  { code: 3, name: "InvalidMilestoneStatus", contract: "AstraeaArbiter" },
];

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8 text-slate-100 pb-24">
      <h1 className="text-3xl font-extrabold text-white tracking-tight">Contract Architecture</h1>
      <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
        Three modules, one settlement asset, and exactly one execution path funds can take out of custody.
      </p>

      {/* ASCII Diagram Panel */}
      <div className="mt-10 overflow-x-auto rounded-xl border border-white/10 bg-slate-950 p-6 font-mono text-[11px] leading-relaxed text-indigo-400 shadow-inner">
        <pre>{`
                  +--------------------+
    funder ---->  |   escrow contract  |  <- holds funds, milestone states,
                  | (custody + vesting)|     and linear stream tracking
                  +---------+----------+
                            ^ release_milestone_funds (arbiter-gated)
                            |
                  +---------+----------+          +------------------------+
    funder /      |  arbiter contract  | -------> |  native XLM SAC token  |
    designated -->| (approve/resolve)  |  invoke  |   (transfer)           |
    mediator      +--------------------+          +------------------------+
`}</pre>
      </div>

      <h2 className="mt-12 text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-white/5 pb-2">
        Active Contracts ({STELLAR_NETWORK.toUpperCase()})
      </h2>
      <div className="mt-4 flex flex-col gap-4">
        {CONTRACTS.map((c) => (
          <div key={c.name} className="rounded-xl border border-white/5 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-2 mb-3">
              <h3 className="text-sm font-bold text-white">{c.name}</h3>
              <span className="text-[10px] uppercase font-bold text-slate-500">{c.role}</span>
            </div>
            <p className="text-xs text-slate-450 leading-relaxed">{c.detail}</p>
            <a
              href={`https://stellar.expert/explorer/${STELLAR_NETWORK}/contract/${c.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block break-all text-xs text-indigo-400 hover:text-indigo-300 underline font-mono"
            >
              {c.address}
            </a>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-white/5 pb-2">
        Inter-Contract Call Sequence
      </h2>
      <p className="mt-2 text-xs text-slate-400 font-sans">
        Every payout — normal approval or a resolved dispute — goes through the same real, on-chain sequence:
      </p>
      <ol className="mt-4 flex flex-col gap-3 font-mono text-xs text-slate-300">
        {[
          "arbiter.approve_milestone_release() or arbiter.resolve_dispute(approve: true)",
          "env.invoke_contract -> escrow.release_milestone_funds()",
          "escrow requires the caller to BE the registered arbiter contract (require_auth on contract address)",
          "env.invoke_contract -> native XLM SAC transfer(escrow -> recipient, amount)",
        ].map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/10 text-[10px] font-bold text-indigo-400 border border-indigo-500/20 font-sans">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-white/5 pb-2">
        Milestone States
      </h2>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          ["ActiveSecured", "#6366F1", "Default state after funding — capital locked and vesting linearly."],
          ["Released", "#34D399", "Paid out to the beneficiary or fully claimed. Terminal state."],
          ["Challenged", "#F59E0B", "Flagged due to conflict. Stream is frozen until arbiter adjudication."],
        ].map(([label, color, desc]) => (
          <div key={label} className="flex flex-col gap-1 rounded-xl border border-white/5 p-4 bg-slate-900/60 shadow-lg">
            <span
              className="w-fit rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-slate-950"
              style={{ backgroundColor: color }}
            >
              {label.toUpperCase()}
            </span>
            <p className="text-xs text-slate-400 leading-relaxed mt-2.5">{desc}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-white/5 pb-2">
        Exception Error Codes
      </h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-white/5 shadow-lg bg-slate-900/20">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-500 font-bold uppercase tracking-wider border-b border-white/5 text-[10px]">
            <tr>
              <th className="px-4 py-3">Contract</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 font-mono text-xs divide-y divide-white/5">
            {ERRORS.map((e) => (
              <tr key={`${e.contract}-${e.code}`} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-indigo-400 font-bold">{e.contract}</td>
                <td className="px-4 py-3 text-white font-bold">{e.code}</td>
                <td className="px-4 py-3">{e.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
