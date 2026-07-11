const FAQS = [
  {
    q: "What happens if a project stage is never approved?",
    a: "It remains in the FundedLocked state and the capital remains locked within the vault contract. Zenith does not feature auto-releases — explicit approval or referee adjudication is always required to move funds.",
  },
  {
    q: "Can the recipient release the stage capital themselves?",
    a: "No. Only the project creator can approve stage payouts, and only the assigned referee can resolve contested stages. The recipient can challenge stage delivery, but cannot trigger payouts.",
  },
  {
    q: "What happens if a dispute contest is rejected?",
    a: "The stage remains Contested and the capital remains locked in the vault. There is intentionally no automatic refund mechanism — a human referee (or governance multi-sig) must step in to adjudicate.",
  },
  {
    q: "Who assigns the designated referee?",
    a: "The project creator does, at the time they initialize the vault and assign the referee signer. The referee can be any valid Stellar address — a neutral developer, a multisig wallet, or a DAO contract.",
  },
  {
    q: "Can a stage payout be triggered twice?",
    a: "No. The vault contract transitions the stage state to Disbursed before invoking any token transfers. A subsequent payout invocation will fail ledger simulation with an AlreadyDisbursed exception on-chain.",
  },
  {
    q: "What settlement token does Zenith utilize?",
    a: "Native XLM, routed directly through its Stellar Asset Contract (SAC) wrapper. No proprietary custom token is deployed — the SAC wrapper handles asset balances and secure transfer rules.",
  },
  {
    q: "What if I execute an unauthorized action?",
    a: "The terminal UI gates and disables the corresponding action buttons. If you bypass UI gating, the transaction simulation will fail with an explicit authorization exception — the smart contract validation rules are the ultimate source of truth.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-8 font-mono">
      <h1 className="text-2xl font-black text-white uppercase tracking-wider">{"// SYSTEM FAQ"}</h1>
      <p className="mt-3 text-xs text-cyber-gray-400 font-sans leading-relaxed">
        Specifications regarding stage gates, contested disputes, and role permissions.
      </p>

      <div className="mt-10 flex flex-col divide-y divide-cyber-border">
        {FAQS.map((f) => (
          <details key={f.q} className="group py-5 font-mono">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs font-bold uppercase tracking-wider text-cyber-cyan hover:text-white transition-colors">
              <span>{`>> ${f.q}`}</span>
              <span className="shrink-0 text-cyber-cyan transition-transform group-open:rotate-45 font-bold">
                +
              </span>
            </summary>
            <p className="mt-3 text-xs text-cyber-gray-400 font-sans leading-relaxed pl-4 border-l border-cyber-border">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </main>
  );
}
