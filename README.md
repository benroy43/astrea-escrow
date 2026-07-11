# Zenith — Staged Settlement Vaults

[![CI](https://github.com/Lkain2029/zenith-stellar/actions/workflows/ci.yml/badge.svg)](https://github.com/Lkain2029/zenith-stellar/actions/workflows/ci.yml)

Live Deployment Instance: [zenith-stellar.acorn-maker-outer.workers.dev](https://zenith-stellar.acorn-maker-outer.workers.dev/)

<p align="center">
  <img src="screenshots/demo.gif" alt="Zenith Staged Settlement Vaults Demo" width="800" />
</p>

Zenith is a three-contract decentralized staged-settlement system built on Stellar (Soroban + Next.js). Instead of releasing project capital all at once, funds are locked in stage gates and disbursed stage by stage. If a stage is contested, an assigned referee signer adjudicates the conflict directly on-chain.

---

## Level 1 — Core Infrastructure & Basic Transactions
* **Wallet Authorization**: Zenith integrates with the Freighter extension on Stellar Testnet for all write transactions.
* **Connection Framework**: The user interface features clear, prominent `CONNECT WALLET` and `DISCONNECT` triggers in the header navigation panel.
* **Balance Interface**: Real-time polling queries the Stellar network via horizon client API to display native XLM balances inside the wallet connection panel.
* **Transaction Pipeline**: Initiating new vaults or releasing funds triggers on-chain transitions, broadcasting operations with visual status feedback and transaction hash tracking.

---

## Level 2 — Multi-Wallet & Smart Contract Binding
* **Multi-Wallet Adapter**: Employs `@creit.tech/stellar-wallets-kit` (StellarWalletsKit) to initialize multi-wallet modal interfaces.
* **Granular Exception Handling**: The application handles and displays visual warnings for exactly three fallback exception states:
  1. **Wallet Not Found**: Renders instruction prompts when browser extensions are missing.
  2. **Signature Rejected**: Renders a warning banner when operations are cancelled.
  3. **Insufficient Network Balance**: Informs users when accounts cannot cover milestone allocations or transaction fees.
* **Contract Execution**: Client bindings handle read operations (`fetch_vault_state`, `total_vaults_registered`) and write invocations (`initialize_vault`, `activate_vault_capital`, `approve_stage_payout`, `challenge_stage_delivery`, `adjudicate_stage_contest`).
* **Status & Sync Tracking**: Real-time transaction statuses are synchronized, displaying Pending ➔ Success or Failure indicators with inline transaction links.

---

## Level 3 — Advanced Architecture & Production Readiness
* **Inter-Contract Cross Invocations**: Executed via cross-contract calls between the referee contract, the vault custody contract, and the native XLM Stellar Asset Contract (SAC).
* **Real-Time Data Streaming**: Client queries fetch ledger event streams to update the live capital status tracker automatically.
* **Responsive Adaptations**: The interface is fully mobile-responsive, optimized down to ~375px (iPhone SE viewport) and ~768px (tablet viewports).
* **Automated Verification Workflows**: Features a GitHub Actions workflow configured in `.github/workflows/ci.yml` that automatically runs cargo workspace testing and Next.js static builds on every push.

---

## Inter-Contract Calls
Every milestone payout in Zenith executes a verified cross-contract invoke chain:
1. The referee contract triggers payout using:
   ```rust
   env.invoke_contract::<bool>(&vault_addr, &Symbol::new(&env, "payout_completed_stage"), args)
   ```
2. The vault contract verifies that the direct caller address is the registered referee contract:
   ```rust
   vault.arbiter_contract.require_auth()
   ```
3. Upon validation, the vault contract performs a cross-contract transfer call to the native XLM Stellar Asset Contract:
   ```rust
   env.invoke_contract::<()>(&vault.token, &Symbol::new(&env, "transfer"), args)
   ```

---

## Verified Deployments (Stellar Testnet)

| Contract | Address | Explorer Endpoint |
|---|---|---|
| **Vault** | `CAPIYP2UL6XQ5ZMB27KNGTAC2RDIMLR7YPHTDV75OKCCL7JLMOMZF5W7` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CAPIYP2UL6XQ5ZMB27KNGTAC2RDIMLR7YPHTDV75OKCCL7JLMOMZF5W7) |
| **Referee** | `CDS72WCPUGIT46RUVDRWRHKVKJQIGPP53DIRWQQWYZOMQRVOYLDP4BYH` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDS72WCPUGIT46RUVDRWRHKVKJQIGPP53DIRWQQWYZOMQRVOYLDP4BYH) |
| **Native SAC** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |

### Transaction Logs

* **Initialize Vault**: [fb4a4bb001e7eaf19759d8a74ec49356bd6a67027d42f124198739ee6afce4f2](https://stellar.expert/explorer/testnet/tx/fb4a4bb001e7eaf19759d8a74ec49356bd6a67027d42f124198739ee6afce4f2)
* **Activate Capital**: [33b93d4603750b0062848ed7880cb2cd8849b5bf59210ffaf16268f20e7fe726](https://stellar.expert/explorer/testnet/tx/33b93d4603750b0062848ed7880cb2cd8849b5bf59210ffaf16268f20e7fe726)
* **Approve Stage**: [bc4d8f77636c05b36041c5cb497eaf0061606958ea7f8e07d94f901a0300fa07](https://stellar.expert/explorer/testnet/tx/bc4d8f77636c05b36041c5cb497eaf0061606958ea7f8e07d94f901a0300fa07)

---

## Visual Demonstrations

### System Dashboard & Contract Terminal
The Zenith Staged Settlement terminal interface features real-time diagnostics, system uptime metrics, and designated dispute referee details:
![Zenith Terminal Interface](screenshots/zenith-terminal-interface.png)

### Live Stage Gate Tracker
The interactive disbursed capital visualizer maps stage payments and locked funds:
![Zenith Stepper Visual](screenshots/zenith-stepper-visual.png)

### Continuous Integration (CI/CD) Build Run
Below is the verification run from our GitHub Actions CI/CD tab showing passing status for both Rust contract compilation/tests and Next.js static builds:
![CI/CD Build Run](screenshots/ci-cd-run-success.png)
