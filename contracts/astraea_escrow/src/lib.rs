//! Astraea escrow contract.
//!
//! Holds funds for a staged project and releases them milestone-by-milestone.
//! Also supports real-time linear vesting streams.
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, panic_with_error, symbol_short, token, vec, Address,
    Env, IntoVal, Symbol, Val, Vec,
};
use astraea_shared::{TrustEscrow, Milestone, MilestoneStatus};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum EscrowError {
    EscrowNotFound = 1,
    NoStages = 2,
    NonPositiveAmount = 3,
    AmountOverflow = 4,
    AlreadyActivated = 5,
    NotActivated = 6,
    StageOutOfRange = 7,
    AlreadyReleased = 8,
    NotActiveSecured = 9,
    NotAuthorized = 10,
    AssetNotSet = 11,
    Challenged = 12,
    MismatchedDurations = 13,
}

#[soroban_sdk::contracttype]
#[derive(Clone)]
enum DataKey {
    NextId,
    Escrow(u32),
    Activated(u32),
    Asset,
}

const EVT_ESCROW: Symbol = symbol_short!("escrow");

fn load_escrow(env: &Env, vault_id: u32) -> TrustEscrow {
    env.storage()
        .persistent()
        .get(&DataKey::Escrow(vault_id))
        .unwrap_or_else(|| panic_with_error!(env, EscrowError::EscrowNotFound))
}

fn save_escrow(env: &Env, vault_id: u32, escrow: &TrustEscrow) {
    env.storage()
        .persistent()
        .set(&DataKey::Escrow(vault_id), escrow);
}

fn milestone_total(env: &Env, milestones: &Vec<Milestone>) -> i128 {
    let mut total: i128 = 0;
    for m in milestones.iter() {
        total = total
            .checked_add(m.tokens_allocated)
            .unwrap_or_else(|| panic_with_error!(env, EscrowError::AmountOverflow));
    }
    total
}

#[contract]
pub struct AstraeaEscrow;

#[contractimpl]
impl AstraeaEscrow {
    pub fn __constructor(env: Env, asset: Address) {
        env.storage().instance().set(&DataKey::Asset, &asset);
    }

    pub fn create_escrow(
        env: Env,
        funder: Address,
        beneficiary: Address,
        mediator_contract: Address,
        stage_amounts: Vec<i128>,
        stage_durations: Vec<u64>,
    ) -> u32 {
        funder.require_auth();

        if stage_amounts.is_empty() {
            panic_with_error!(&env, EscrowError::NoStages);
        }
        if stage_amounts.len() != stage_durations.len() {
            panic_with_error!(&env, EscrowError::MismatchedDurations);
        }

        let mut milestones: Vec<Milestone> = vec![&env];
        for i in 0..stage_amounts.len() {
            let amount = stage_amounts.get(i).unwrap();
            let duration = stage_durations.get(i).unwrap();
            if amount <= 0 {
                panic_with_error!(&env, EscrowError::NonPositiveAmount);
            }
            milestones.push_back(Milestone {
                tokens_allocated: amount,
                status: MilestoneStatus::ActiveSecured,
                start_time: 0,
                duration,
                claimed_amount: 0,
            });
        }

        milestone_total(&env, &milestones);

        let escrow = TrustEscrow {
            funder,
            beneficiary,
            mediator_contract,
            milestones,
            asset: native_asset_address(&env),
        };

        let vault_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0u32);
        env.storage().instance().set(&DataKey::NextId, &(vault_id + 1));
        save_escrow(&env, vault_id, &escrow);

        env.events().publish(
            (EVT_ESCROW, symbol_short!("created")),
            vault_id,
        );
        vault_id
    }

    pub fn fund_escrow(env: Env, vault_id: u32, funder: Address) -> bool {
        funder.require_auth();

        let mut escrow = load_escrow(&env, vault_id);
        let activated: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Activated(vault_id))
            .unwrap_or(false);
        if activated {
            panic_with_error!(&env, EscrowError::AlreadyActivated);
        }

        let total = milestone_total(&env, &escrow.milestones);
        token::TokenClient::new(&env, &escrow.asset).transfer(
            &funder,
            &env.current_contract_address(),
            &total,
        );

        let current_time = env.ledger().timestamp();
        let mut updated_milestones: Vec<Milestone> = vec![&env];
        for mut m in escrow.milestones.iter() {
            m.start_time = current_time;
            updated_milestones.push_back(m);
        }
        escrow.milestones = updated_milestones;
        save_escrow(&env, vault_id, &escrow);

        env.storage()
            .persistent()
            .set(&DataKey::Activated(vault_id), &true);
        env.events()
            .publish((EVT_ESCROW, symbol_short!("funded")), vault_id);
        true
    }

    pub fn claim_vested_funds(env: Env, vault_id: u32, stage_index: u32) -> bool {
        let mut escrow = load_escrow(&env, vault_id);

        let activated: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Activated(vault_id))
            .unwrap_or(false);
        if !activated {
            panic_with_error!(&env, EscrowError::NotActivated);
        }

        let mut milestone = escrow
            .milestones
            .get(stage_index)
            .unwrap_or_else(|| panic_with_error!(&env, EscrowError::StageOutOfRange));

        if milestone.status == MilestoneStatus::Released {
            panic_with_error!(&env, EscrowError::AlreadyReleased);
        }
        if milestone.status == MilestoneStatus::Challenged {
            panic_with_error!(&env, EscrowError::Challenged);
        }

        let elapsed = env.ledger().timestamp().saturating_sub(milestone.start_time);
        let vested = if elapsed >= milestone.duration || milestone.duration == 0 {
            milestone.tokens_allocated
        } else {
            let num = milestone.tokens_allocated.checked_mul(elapsed as i128).unwrap();
            num / (milestone.duration as i128)
        };

        let claimable = vested.checked_sub(milestone.claimed_amount).unwrap();
        if claimable <= 0 {
            return false;
        }

        milestone.claimed_amount = milestone.claimed_amount.checked_add(claimable).unwrap();
        if milestone.claimed_amount == milestone.tokens_allocated {
            milestone.status = MilestoneStatus::Released;
        }
        escrow.milestones.set(stage_index, milestone.clone());
        save_escrow(&env, vault_id, &escrow);

        let args: Vec<Val> = vec![
            &env,
            env.current_contract_address().into_val(&env),
            escrow.beneficiary.into_val(&env),
            claimable.into_val(&env),
        ];
        env.invoke_contract::<()>(&escrow.asset, &symbol_short!("transfer"), args);

        env.events().publish(
            (EVT_ESCROW, symbol_short!("claimed")),
            (vault_id, stage_index, claimable),
        );
        true
    }

    pub fn release_milestone_funds(env: Env, vault_id: u32, stage_index: u32) -> bool {
        let mut escrow = load_escrow(&env, vault_id);

        escrow.mediator_contract.require_auth();

        let activated: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Activated(vault_id))
            .unwrap_or(false);
        if !activated {
            panic_with_error!(&env, EscrowError::NotActivated);
        }

        let mut milestone = escrow
            .milestones
            .get(stage_index)
            .unwrap_or_else(|| panic_with_error!(&env, EscrowError::StageOutOfRange));
        if milestone.status == MilestoneStatus::Released {
            panic_with_error!(&env, EscrowError::AlreadyReleased);
        }

        let claimable = milestone.tokens_allocated.checked_sub(milestone.claimed_amount).unwrap();

        milestone.claimed_amount = milestone.tokens_allocated;
        milestone.status = MilestoneStatus::Released;
        escrow.milestones.set(stage_index, milestone.clone());
        save_escrow(&env, vault_id, &escrow);

        if claimable > 0 {
            let args: Vec<Val> = vec![
                &env,
                env.current_contract_address().into_val(&env),
                escrow.beneficiary.into_val(&env),
                claimable.into_val(&env),
            ];
            env.invoke_contract::<()>(&escrow.asset, &symbol_short!("transfer"), args);
        }

        env.events().publish(
            (EVT_ESCROW, symbol_short!("released")),
            (vault_id, stage_index),
        );
        true
    }

    pub fn contest_milestone(env: Env, vault_id: u32, stage_index: u32, caller: Address) -> bool {
        caller.require_auth();

        let mut escrow = load_escrow(&env, vault_id);
        if caller != escrow.funder && caller != escrow.beneficiary {
            panic_with_error!(&env, EscrowError::NotAuthorized);
        }

        let activated: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Activated(vault_id))
            .unwrap_or(false);
        if !activated {
            panic_with_error!(&env, EscrowError::NotActivated);
        }

        let mut milestone = escrow
            .milestones
            .get(stage_index)
            .unwrap_or_else(|| panic_with_error!(&env, EscrowError::StageOutOfRange));
        if milestone.status != MilestoneStatus::ActiveSecured {
            panic_with_error!(&env, EscrowError::NotActiveSecured);
        }

        milestone.status = MilestoneStatus::Challenged;
        escrow.milestones.set(stage_index, milestone);
        save_escrow(&env, vault_id, &escrow);

        env.events().publish(
            (EVT_ESCROW, symbol_short!("disputed")),
            (vault_id, stage_index),
        );
        true
    }

    pub fn get_escrow_details(env: Env, vault_id: u32) -> TrustEscrow {
        load_escrow(&env, vault_id)
    }

    pub fn is_escrow_funded(env: Env, vault_id: u32) -> bool {
        load_escrow(&env, vault_id);
        env.storage()
            .persistent()
            .get(&DataKey::Activated(vault_id))
            .unwrap_or(false)
    }

    pub fn total_escrows_created(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0u32)
    }
}

fn native_asset_address(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Asset)
        .unwrap_or_else(|| panic_with_error!(env, EscrowError::AssetNotSet))
}
