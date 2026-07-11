# Zenith — Testnet Deployment Evidence

Generated 2026-07-11. Network: Stellar Testnet ("Test SDF Network ; September 2015").

## Identities

| Role | Alias | Address |
|---|---|---|
| Deployer / Creator | zenith-deployer | GDMWBEQEGVRA5TWLWZSP42M3XS76ZMMYRCEKR3TBT7WIPWUOZZL7B57I |
| Beneficiary | zenith-recipient | GBXTFMY4F5XWMILV3KAQLEG3BQ5OBJNZMNZNX4HR2PGEAE6Y3XV4EXZK |
| Referee Signer | zenith-referee-signer | GCZIAGXR7VQSAZKWA3LSYNHIL5XW5UXICGQ43YDYYSQHI4AGE45NWBQ3 |

## Contract Addresses

| Contract | Address | Stellar Expert Explorer |
|---|---|---|
| Vault | CAPIYP2UL6XQ5ZMB27KNGTAC2RDIMLR7YPHTDV75OKCCL7JLMOMZF5W7 | https://stellar.expert/explorer/testnet/contract/CAPIYP2UL6XQ5ZMB27KNGTAC2RDIMLR7YPHTDV75OKCCL7JLMOMZF5W7 |
| Referee | CDS72WCPUGIT46RUVDRWRHKVKJQIGPP53DIRWQQWYZOMQRVOYLDP4BYH | https://stellar.expert/explorer/testnet/contract/CDS72WCPUGIT46RUVDRWRHKVKJQIGPP53DIRWQQWYZOMQRVOYLDP4BYH |
| Native XLM SAC | CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC | https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC |

## Flow 1 — initialize → activate → approve → disburse (vault_id = 0)

Milestones: [10,000,000, 20,000,000] stroops (1 XLM + 2 XLM).

| Step | Tx Hash |
|---|---|
| initialize_vault | fb4a4bb001e7eaf19759d8a74ec49356bd6a67027d42f124198739ee6afce4f2 |
| activate_vault_capital | 33b93d4603750b0062848ed7880cb2cd8849b5bf59210ffaf16268f20e7fe726 |
| assign_dispute_referee | 61b0ef8c6d698512b0005f944b7a9b41ed8f77328e7bef95430977df023993a8 |
| **approve_stage_payout** (referee ➔ vault ➔ SAC transfer) | **bc4d8f77636c05b36041c5cb497eaf0061606958ea7f8e07d94f901a0300fa07** |

`approve_stage_payout` tx emitted:
1. `transfer` event from the native SAC contract: transfers 10,000,000 stroops from Vault contract to Beneficiary account.
2. `released` event from Vault contract marking the stage as Disbursed.
3. `approved` event from Referee contract confirming project owner authorization.

## Flow 2 — initialize → activate → challenge → adjudicate (vault_id = 1)

Milestones: [15,000,000] stroops.

| Step | Tx Hash |
|---|---|
| initialize_vault | e730baf8a56b1eaa386a727b985ca4793cd88800b5f83e2da360a2d67915b636 |
| activate_vault_capital | 257c37aee7031bfa33d1aa0a59047eb1f08c78cdc52032d9d7887f7a49772302 |
| assign_dispute_referee | 73a1a01a7c7624906b94dca4bdea2fe9fa0bf5c71ce79efd580faec26b24efac |
| challenge_stage_delivery | 53f2126e70de783548f50da1baf22b06af86971ff14e175ad1a6945a1517d67e |
| **adjudicate_stage_contest(approve=true)** (referee ➔ vault ➔ SAC transfer) | **301d2aa43505ff0d09458c748e2d3c3773f8b0fdbe55119d00d48219aa5d12df** |

`adjudicate_stage_contest` tx emitted:
1. `transfer` event from native SAC contract: transfers 15,000,000 stroops from Vault contract to Beneficiary.
2. `released` event from Vault contract.
3. `resolved` event from Referee contract showing `approve = true`.
