const FAQS = [
  {
    q: "What happens if a milestone is never approved?",
    a: "It remains in the ActiveSecured state. The capital is held securely in the escrow contract and continues to vest linearly over time. Only the project funder can explicitly approve the full release, or the designated arbiter can resolve a dispute.",
  },
  {
    q: "How does the linear vesting stream work?",
    a: "Every second, a portion of the milestone capital becomes claimable based on the formula: vested_amount = deposit * elapsed_time / duration. The beneficiary can call claim_vested_funds at any time to withdraw what has vested so far.",
  },
  {
    q: "Can the beneficiary release the full milestone capital themselves?",
    a: "No. The beneficiary can only claim the portion that has vested according to the time elapsed. They cannot force-release the unvested balance; that requires explicit approval from the funder or a dispute resolution from the arbiter.",
  },
  {
    q: "What happens if a milestone is contested?",
    a: "The milestone transitions to the Challenged state. While challenged, all linear vesting claims are frozen. The designated mediator must adjudicate the case, deciding whether to disburse the remaining milestone capital or keep it locked.",
  },
  {
    q: "Who assigns the mediator/arbiter?",
    a: "The project funder registers the designated arbiter at the time of escrow creation. The arbiter can be any valid Stellar address — a neutral third party, a multi-sig, or a governance contract.",
  },
  {
    q: "Can milestone funds be double-claimed or double-paid?",
    a: "No. The escrow contract tracks exactly how many tokens have been claimed and released. Once the total claimed amount equals the milestone allocation, the milestone is marked Released and no further payouts can be triggered.",
  },
  {
    q: "What settlement token does Astraea utilize?",
    a: "It utilizes native Stellar Lumens (XLM) routed through its official Stellar Asset Contract (SAC) wrapper on-chain, ensuring high security and transaction finality.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-8 text-slate-100 pb-24">
      <h1 className="text-3xl font-extrabold text-white tracking-tight">System FAQ</h1>
      <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
        Frequently asked questions regarding milestone gates, linear vesting streams, and arbitration rules.
      </p>

      <div className="mt-10 flex flex-col divide-y divide-white/5 border-t border-b border-white/5">
        {FAQS.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-indigo-400 transition-colors select-none">
              <span>{f.q}</span>
              <span className="shrink-0 text-indigo-400 transition-transform group-open:rotate-45 font-bold text-sm">
                +
              </span>
            </summary>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed pl-4 border-l border-white/5 font-normal">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </main>
  );
}
