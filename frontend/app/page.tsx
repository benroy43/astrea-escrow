import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "PLAN STAGE GATE DETAILS",
    body:
      "Define stage gates, amount thresholds, recipient key, and a designated dispute referee. The plan is committed without transferring funds.",
  },
  {
    n: "02",
    title: "ACTIVATE VAULT CAPITAL",
    body:
      "Deposit the full project budget in one transaction. Capital enters the contract securely as native XLM, activating the workflow.",
  },
  {
    n: "03",
    title: "DISBURSE STAGE PAYOUTS",
    body:
      "As milestones are finalized, the project creator authorizes releases stage by stage. Funds flow instantly to the beneficiary.",
  },
  {
    n: "04",
    title: "ADJUDICATE CONFLICTS",
    body:
      "If a stage is marked contested, payouts freeze. The assigned referee reviews deliverables and rules to disburse or lock funds.",
  },
];

const FEATURES = [
  {
    title: "CROSS-CONTRACT CALL CHAIN",
    body:
      "Approvals flow referee ➔ vault ➔ native XLM SAC contract through genuine env.invoke_contract invocations, verified securely on-chain.",
  },
  {
    title: "EXPLICIT CONTESTED STATE",
    body:
      "Features FundedLocked, Disbursed, and Contested states. Assets remain securely locked in the vault until conflict resolution is finalized.",
  },
  {
    title: "ENFORCED ROLE AUTHORIZATION",
    body:
      "Only the registered referee contract can trigger stage payouts. Direct, unauthorized calls from standard accounts are blocked on-chain.",
  },
  {
    title: "CHECKED ARITHMETIC SAFETY",
    body:
      "All math is computed using Soroban i128 integer stroop precision. Overflow events immediately trigger runtime transaction panics.",
  },
];

export default function LandingPage() {
  return (
    <main className="font-mono">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-8 sm:pt-24 border-b border-cyber-border">
        <div className="relative mx-auto flex max-w-3xl flex-col items-start gap-6">
          <span className="rounded border border-cyber-cyan/30 bg-cyber-cyan/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyber-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]">
            SOROBAN ON TESTNET // ACTIVE
          </span>
          <h1 className="text-3xl font-black leading-none text-white sm:text-5xl tracking-tight uppercase">
            STAGE-GATED CUSTODY FOR DECISION FLOWS.
          </h1>
          <p className="max-w-xl font-sans text-sm sm:text-base text-cyber-gray-400 leading-relaxed">
            Zenith secures project budgets in escrow vaults and releases capital stage by stage.
            If milestones are contested, a designated referee adjudicates the conflict directly on-chain — funds never auto-release and never get stuck.
          </p>
          <div className="flex flex-wrap gap-4 mt-2">
            <Link
              href="/app"
              className="rounded border border-cyber-cyan bg-cyber-cyan text-cyber-bg px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-transparent hover:text-cyber-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] transition-all"
            >
              Launch Terminal
            </Link>
            <Link
              href="/architecture"
              className="rounded border border-cyber-gray-600 bg-transparent px-6 py-3 text-xs font-bold uppercase tracking-wider text-cyber-gray-400 hover:text-white hover:border-white transition-all"
            >
              Specs & Diagram
            </Link>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="border-b border-cyber-border bg-cyber-card/30">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-8 text-center sm:grid-cols-4 sm:px-8">
          {[
            ["3", "CONVENTIONAL CONTRACTS"],
            ["3", "DISTINCT STAGE STATES"],
            ["6", "INTEGRATION TESTS"],
            ["1", "NATIVE XLM ASSET WRAPPER"],
          ].map(([n, label]) => (
            <div key={label} className="flex flex-col gap-1 border-r border-cyber-border last:border-none">
              <span className="text-3xl font-black text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]">{n}</span>
              <span className="text-[9px] uppercase tracking-wider text-cyber-gray-500 font-bold">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:px-8 border-b border-cyber-border">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-sm font-black uppercase tracking-widest text-cyber-cyan">
            {"// VAULT STATE TRANSITION PIPELINE"}
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.n} className="cyber-panel rounded p-6">
                <span className="text-2xl font-black text-cyber-gray-600">{s.n}</span>
                <h3 className="mt-2 text-xs font-bold text-white tracking-wider uppercase">{s.title}</h3>
                <p className="mt-2 font-sans text-xs text-cyber-gray-400 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-cyber-card/20 px-4 py-16 sm:px-8 border-b border-cyber-border">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-sm font-black uppercase tracking-widest text-cyber-cyan">
            {"// MATHEMATICAL & CRYPTOGRAPHIC ASSURANCES"}
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyber-cyan shadow-[0_0_6px_#00f0ff]" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{f.title}</h3>
                  <p className="mt-1 font-sans text-xs text-cyber-gray-400 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-8">
        <div className="cyber-panel mx-auto flex max-w-3xl flex-col items-start gap-5 rounded p-8">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">{"// INITIALIZE CUSTODY SEGMENT"}</h2>
          <p className="font-sans text-xs text-cyber-gray-400 leading-relaxed">
            Connect Freighter, define milestone thresholds, and deposit capital. The decentralized terminal maps and updates every stage transaction live.
          </p>
          <Link
            href="/app"
            className="rounded border border-cyber-cyan bg-cyber-cyan text-cyber-bg px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-transparent hover:text-cyber-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] transition-all"
          >
            Launch Terminal
          </Link>
        </div>
      </section>
    </main>
  );
}
