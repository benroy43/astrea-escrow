//! Types shared between the Astraea `escrow` and `arbiter` contracts.
//!
//! Both contracts encode/decode these values across the contract boundary.
#![no_std]

use soroban_sdk::{contracttype, Address, Vec};

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MilestoneStatus {
    ActiveSecured,
    Released,
    Challenged,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Milestone {
    pub tokens_allocated: i128,
    pub status: MilestoneStatus,
    pub start_time: u64,
    pub duration: u64,
    pub claimed_amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TrustEscrow {
    pub funder: Address,
    pub beneficiary: Address,
    pub mediator_contract: Address,
    pub milestones: Vec<Milestone>,
    pub asset: Address,
}
