//! Types shared between the Zenith `vault` and `referee` contracts.
//!
//! Both contracts encode/decode these values across the contract boundary
//! (e.g. `referee` reads a `PhaseVault` back from `vault.fetch_vault_state`), so the
//! definitions live in one crate to guarantee the XDR representations match.
#![no_std]

use soroban_sdk::{contracttype, Address, Vec};

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum StageState {
    FundedLocked,
    Disbursed,
    Contested,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VaultStage {
    pub amount: i128,
    pub state: StageState,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PhaseVault {
    pub creator: Address,
    pub recipient: Address,
    pub arbiter_contract: Address,
    pub stages: Vec<VaultStage>,
    pub token: Address,
}
