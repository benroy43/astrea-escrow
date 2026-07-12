# Astraea Trust — Testnet Deployment Evidence

Generated 2026-07-12. Network: Stellar Testnet ("Test SDF Network ; September 2015").

## Identities

| Role | Alias | Address |
|---|---|---|
| Deployer / Funder | deployer | GAKF7GXDBJS2MMMVFHE4UNEKXJM3BABM3DQCSTF3JKRKN5WZI4GW4TIV |
| Beneficiary | astraea-recipient | GDG5I56GJXI35DWFURL2NTBPZ2UQW6SIPSFWSCIGJXXGBVTQTTZM5LI2 |
| Mediator Signer | astraea-mediator | GDPS2HBEP57LEJHJTQBREID36TPJSNWSYVLVEYWLT6R4SB2SLL2R4DOI |

## Contract Addresses

| Contract | Address | Stellar Expert Explorer |
|---|---|---|
| Escrow | CCVBRURBGRBQ7BEWOX6OV2PNJ3Y7YVSXAXTJ6C2JDMGR4PXQBPAOTC7U | https://stellar.expert/explorer/testnet/contract/CCVBRURBGRBQ7BEWOX6OV2PNJ3Y7YVSXAXTJ6C2JDMGR4PXQBPAOTC7U |
| Arbiter | CBBVFQTBKQTLXQVLWNOXCRHXBB7WBN3JAV5C76LCZCZ7RRLN54EFLQTJ | https://stellar.expert/explorer/testnet/contract/CBBVFQTBKQTLXQVLWNOXCRHXBB7WBN3JAV5C76LCZCZ7RRLN54EFLQTJ |
| Native XLM SAC | CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC | https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC |

## Flow 1 — create_escrow → fund_escrow → claim_vested_funds → approve_milestone_release (vault_id = 0, stage 0)

Milestone 0: 10 XLM (10,000,000 stroops) with a stream duration of 60 seconds.

| Step | Tx Hash |
|---|---|
| create_escrow | b2b32bfd8672a9fe6b4d1e0ea0d046c96a959ba0961dfb6b99ab1753a6b511f0 |
| register_mediator | 4e0f916a187900771453abbaed7a1e8549bd05f1c5e1463c6a96db18ad835d44 |
| fund_escrow | 6dae30938103529dcc22ac77457ca5c14f127276c9e3c26f660da468c212b79f |
| claim_vested_funds | b6f4df3740c6d83948fa5b95d4c4ac250855703d70285e01f5569e3f079857d4 |
| approve_milestone_release | 539751a26d96207a6c0b0355856bab543b93f62556b25382900bfbddb4548d30 |

## Flow 2 — fund_escrow → contest_milestone → resolve_dispute (vault_id = 0, stage 1)

Milestone 1: 20 XLM (20,000,000 stroops) with a stream duration of 120 seconds.

| Step | Tx Hash |
|---|---|
| contest_milestone | d6e64a3c146adc6157314064ca6c8e5c82c391bf0143808992e9faa594f277c3 |
| resolve_dispute | f0154be640a4a75420cdb54408cb7316f74b5ed43eab7e7b7c8aa71f75558e55 |
