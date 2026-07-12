//! Astraea arbiter contract.
//!
//! Owns the dispute resolution and payout trigger logic for Astraea escrows.
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, panic_with_error, symbol_short, vec, Address, Env,
    IntoVal, Symbol, Val, Vec,
};
use astraea_shared::{TrustEscrow, MilestoneStatus};

fn sym_get_escrow_details(env: &Env) -> Symbol {
    Symbol::new(env, "get_escrow_details")
}

fn sym_release_milestone_funds(env: &Env) -> Symbol {
    Symbol::new(env, "release_milestone_funds")
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ArbiterError {
    NotFunder = 1,
    NotDesignatedMediator = 2,
    InvalidMilestoneStatus = 3,
    StageOutOfRange = 4,
}

#[soroban_sdk::contracttype]
#[derive(Clone)]
enum DataKey {
    EscrowContractAddr,
    DesignatedMediator(u32),
}

const EVT_ARBITER: Symbol = symbol_short!("arbiter");

#[contract]
pub struct AstraeaArbiter;

#[contractimpl]
impl AstraeaArbiter {
    pub fn __constructor(env: Env, escrow_contract: Address) {
        env.storage()
            .instance()
            .set(&DataKey::EscrowContractAddr, &escrow_contract);
    }

    pub fn register_mediator(env: Env, vault_id: u32, funder: Address, designated_mediator: Address) {
        funder.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::DesignatedMediator(vault_id), &designated_mediator);
    }

    pub fn approve_milestone_release(env: Env, vault_id: u32, stage_index: u32, approver: Address) -> bool {
        approver.require_auth();

        let escrow_addr = escrow_contract_addr(&env);
        let escrow = get_escrow(&env, &escrow_addr, vault_id);

        if approver != escrow.funder {
            panic_with_error!(&env, ArbiterError::NotFunder);
        }

        let milestone = escrow
            .milestones
            .get(stage_index)
            .unwrap_or_else(|| panic_with_error!(&env, ArbiterError::StageOutOfRange));
        if milestone.status != MilestoneStatus::ActiveSecured {
            panic_with_error!(&env, ArbiterError::InvalidMilestoneStatus);
        }

        release_milestone(&env, &escrow_addr, vault_id, stage_index);

        env.events().publish(
            (EVT_ARBITER, symbol_short!("approved")),
            (vault_id, stage_index),
        );
        true
    }

    pub fn resolve_dispute(
        env: Env,
        vault_id: u32,
        stage_index: u32,
        approve: bool,
        designated_mediator: Address,
    ) -> bool {
        designated_mediator.require_auth();

        let stored: Address = env
            .storage()
            .persistent()
            .get(&DataKey::DesignatedMediator(vault_id))
            .unwrap_or_else(|| panic_with_error!(&env, ArbiterError::NotDesignatedMediator));
        if designated_mediator != stored {
            panic_with_error!(&env, ArbiterError::NotDesignatedMediator);
        }

        let escrow_addr = escrow_contract_addr(&env);
        let escrow = get_escrow(&env, &escrow_addr, vault_id);
        let milestone = escrow
            .milestones
            .get(stage_index)
            .unwrap_or_else(|| panic_with_error!(&env, ArbiterError::StageOutOfRange));
        if milestone.status != MilestoneStatus::Challenged {
            panic_with_error!(&env, ArbiterError::InvalidMilestoneStatus);
        }

        if approve {
            release_milestone(&env, &escrow_addr, vault_id, stage_index);
        }

        env.events().publish(
            (EVT_ARBITER, symbol_short!("resolved")),
            (vault_id, stage_index, approve),
        );
        approve
    }

    pub fn get_assigned_mediator(env: Env, vault_id: u32) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::DesignatedMediator(vault_id))
            .unwrap_or_else(|| panic_with_error!(&env, ArbiterError::NotDesignatedMediator))
    }
}

fn escrow_contract_addr(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::EscrowContractAddr)
        .unwrap()
}

fn get_escrow(env: &Env, escrow_addr: &Address, vault_id: u32) -> TrustEscrow {
    let args: Vec<Val> = vec![env, vault_id.into_val(env)];
    env.invoke_contract(escrow_addr, &sym_get_escrow_details(env), args)
}

fn release_milestone(env: &Env, escrow_addr: &Address, vault_id: u32, stage_index: u32) {
    let args: Vec<Val> = vec![env, vault_id.into_val(env), stage_index.into_val(env)];
    env.invoke_contract::<bool>(escrow_addr, &sym_release_milestone_funds(env), args);
}

mod test;
