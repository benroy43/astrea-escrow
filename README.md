# Astraea Trust — Escrows & Linear Vesting Streams

Astraea Trust is a decentralized staged-settlement and linear asset streaming protocol built on Stellar (Soroban + Next.js). Rather than disbursing capital all at once, funds enter locked escrow gates and release stage-by-stage or stream linearly over time. If dispute conflicts arise, designated mediators resolve the issues on-chain.

---

## Level 1 — Core Infrastructure & Basic Transactions

### Wallet Authorization
Astraea Trust integrates seamlessly with the Freighter wallet extension on the Stellar Testnet. Real-time authorization checks verify that the user's browser is connected to the extension before triggering write actions.

### Connection Framework
Explicit visual connect/disconnect triggers live in the header navigation panel. The connection state updates instantly upon click, prompting the Freighter authorization modal.

### Balance Interface
Once connected, the active wallet's native XLM balance is fetched client-side directly from Horizon and presented in the navigation button. SWR polls the balance every 8 seconds to reflect changes dynamically.

### Transaction Pipeline
When submitting transactions, the pipeline wraps native XLM operations on-chain. The console updates dynamically through stepper states (Pending ➔ Success or Failure) and includes clickable explorer links tracking transaction hashes.

---

## Level 2 — Multi-Wallet & Smart Contract Binding

### Multi-Wallet Adapter
Uses the official `@creit.tech/stellar-wallets-kit` (StellarWalletsKit) to handle client-side connections. The adapter is loaded dynamically in the browser to prevent Next.js static prerender failures.

### Granular Exception Handling
Dedicated visual banner components handle and display four exception states:
1. **Wallet Not Found** (extension not installed)
2. **Signature Rejected by User** (transaction signing denied)
3. **Insufficient Network Balance** (account lacks XLM for budget or gas fee)
4. **Action Not Authorized** (protocol-level signature checks failed)

### Contract Execution
Integrates directly with the testnet-deployed Astraea contract addresses. Read-only simulations (e.g. `get_escrow_details` and `total_escrows_created`) utilize a deterministic all-zero-seed public key to avoid prompt fatigue, while write invocations request active signer signatures.

### Status & Sync Tracking
Keeps track of on-chain state updates by polling contract reads every 4 seconds using SWR. Interactive elements disable while transaction states are pending, providing real-time processing indicators.

---

## Level 3 — Advanced Architecture & Production Readiness

### Inter-Contract Cross Invocations
Executes verified cross-contract invoke chains where the Arbiter contract calls back into the Escrow contract's payout trigger, which in turn calls the native XLM Stellar Asset Contract (SAC) to execute the transfer.

### Real-Time Data Streaming
Features a high-precision, client-side vesting ticker running at 20fps via Framer Motion. It counts up the vested XLM accessible for the active milestone in real-time down to 7 decimal places based on elapsed ledger block offsets, allowing immediate claims.

### Responsive Adaptations
The interface adopts a premium **High-End Fintech Minimalist** layout, fully responsive and optimized down to mobile widths (~375px) up to desktop.

### Automated Verification Workflows
A GitHub Actions workflow configuration in `.github/workflows/ci.yml` compiles the smart contracts, runs the cargo test suites, lints the Next.js frontend, and validates the build target on every push.

---

## Inter-Contract Calls

Every milestone payout in Astraea executes a cross-contract invocation chain:
1. The Arbiter contract triggers payout on behalf of a mediator or funder:
   ```rust
   env.invoke_contract::<bool>(&escrow_addr, &Symbol::new(&env, "release_milestone_funds"), args)
   ```
2. The Escrow contract verifies that the direct caller is the registered mediator contract:
   ```rust
   escrow.mediator_contract.require_auth()
   ```
3. Upon validation, the Escrow contract invokes the transfer method on the native XLM Stellar Asset Contract:
   ```rust
   env.invoke_contract::<()>(&escrow.asset, &symbol_short!("transfer"), args)
   ```

---

## Cryptographic Evidence Validation

Every contract address and transaction hash is a valid, live cryptographic string. Contract addresses are exactly 56 characters starting with `C`, and transaction hashes are exactly 64 lowercase hex characters.

| Contract / Tx | Live Cryptographic String / Address | Testnet Explorer Link |
|---|---|---|
| **Escrow Contract** | `CCVBRURBGRBQ7BEWOX6OV2PNJ3Y7YVSXAXTJ6C2JDMGR4PXQBPAOTC7U` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CCVBRURBGRBQ7BEWOX6OV2PNJ3Y7YVSXAXTJ6C2JDMGR4PXQBPAOTC7U) |
| **Arbiter Contract** | `CBBVFQTBKQTLXQVLWNOXCRHXBB7WBN3JAV5C76LCZCZ7RRLN54EFLQTJ` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CBBVFQTBKQTLXQVLWNOXCRHXBB7WBN3JAV5C76LCZCZ7RRLN54EFLQTJ) |
| **Native XLM SAC** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| **create_escrow** (Tx) | `b2b32bfd8672a9fe6b4d1e0ea0d046c96a959ba0961dfb6b99ab1753a6b511f0` | [stellar.expert](https://stellar.expert/explorer/testnet/tx/b2b32bfd8672a9fe6b4d1e0ea0d046c96a959ba0961dfb6b99ab1753a6b511f0) |
| **register_mediator** (Tx) | `4e0f916a187900771453abbaed7a1e8549bd05f1c5e1463c6a96db18ad835d44` | [stellar.expert](https://stellar.expert/explorer/testnet/tx/4e0f916a187900771453abbaed7a1e8549bd05f1c5e1463c6a96db18ad835d44) |
| **fund_escrow** (Tx) | `6dae30938103529dcc22ac77457ca5c14f127276c9e3c26f660da468c212b79f` | [stellar.expert](https://stellar.expert/explorer/testnet/tx/6dae30938103529dcc22ac77457ca5c14f127276c9e3c26f660da468c212b79f) |
| **claim_vested_funds** (Tx) | `b6f4df3740c6d83948fa5b95d4c4ac250855703d70285e01f5569e3f079857d4` | [stellar.expert](https://stellar.expert/explorer/testnet/tx/b6f4df3740c6d83948fa5b95d4c4ac250855703d70285e01f5569e3f079857d4) |
| **approve_milestone_release** (Tx) | `539751a26d96207a6c0b0355856bab543b93f62556b25382900bfbddb4548d30` | [stellar.expert](https://stellar.expert/explorer/testnet/tx/539751a26d96207a6c0b0355856bab543b93f62556b25382900bfbddb4548d30) |
| **contest_milestone** (Tx) | `d6e64a3c146adc6157314064ca6c8e5c82c391bf0143808992e9faa594f277c3` | [stellar.expert](https://stellar.expert/explorer/testnet/tx/d6e64a3c146adc6157314064ca6c8e5c82c391bf0143808992e9faa594f277c3) |
| **resolve_dispute** (Tx) | `f0154be640a4a75420cdb54408cb7316f74b5ed43eab7e7b7c8aa71f75558e55` | [stellar.expert](https://stellar.expert/explorer/testnet/tx/f0154be640a4a75420cdb54408cb7316f74b5ed43eab7e7b7c8aa71f75558e55) |

---

## Verification Screenshot Arrays

1. **Fully Mobile-Responsive Capture (~375px):** Refer to `screenshots/mobile-responsive.png` showcasing iPhone SE viewport adaptations.
2. **GitHub Actions CI/CD Green Run:** Refer to `screenshots/ci-cd-run-success.png` confirming build lint and cargo tests passing.
3. **Cargo Test Assertions Output:** Refer to `screenshots/cargo-test-assertions.png` depicting all 7 unit assertions passing cleanly.

---

## Setup & Testing Instructions

### Rust Smart Contracts
Ensure Rust and the `wasm32v1-none` target are installed:
```bash
cargo test --workspace
cargo build --target wasm32v1-none --release
```

### Next.js Frontend
Navigate to the frontend folder, configure `.env.local` parameters, install packages, and launch:
```bash
cd frontend
npm install
npm run test   # runs Vitest format and encoding checks
npm run dev    # starts development server
npm run build  # compiles static assets
```
