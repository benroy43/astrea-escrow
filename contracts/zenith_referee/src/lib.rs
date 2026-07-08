//! Zenith referee contract.
//!
//! Owns the *decision* logic for releasing vault funds: normal approval by
//! the project creator, and dispute resolution by a designated referee
//! address. Every path that ends in a payout calls back into `vault`'s
//! `payout_completed_stage`, which itself is the only place tokens move. This
//! contract never touches the token directly.
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, panic_with_error, symbol_short, vec, Address, Env,
    IntoVal, Symbol, Val, Vec,
};

fn sym_fetch_vault_state(env: &Env) -> Symbol {
    Symbol::new(env, "fetch_vault_state")
}

fn sym_payout_completed_stage(env: &Env) -> Symbol {
    Symbol::new(env, "payout_completed_stage")
}

use zenith_shared::{PhaseVault, StageState};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RefereeError {
    /// approver is not the vault's creator.
    NotCreator = 1,
    /// designated_referee does not match the vault's registered referee.
    NotDesignatedReferee = 2,
    /// The stage is not in a state this action can operate on.
    InvalidStageState = 3,
    /// stage_index is out of range.
    StageOutOfRange = 4,
}

/// Per-vault settings this contract needs beyond what `vault` stores: the
/// address empowered to resolve disputes, and the vault
/// contract's own address so it can be invoked cross-contract.
#[soroban_sdk::contracttype]
#[derive(Clone)]
enum DataKey {
    /// VaultContractAddr -> Address, set once by the constructor.
    VaultContractAddr,
    /// DesignatedReferee(vault_id) -> Address registered for that vault.
    DesignatedReferee(u32),
}

const EVT_REF: Symbol = symbol_short!("referee");

#[contract]
pub struct RefereeContract;

#[contractimpl]
impl RefereeContract {
    /// Deploy-time constructor: pin the vault contract this referee serves.
    pub fn __constructor(env: Env, vault_contract: Address) {
        env.storage()
            .instance()
            .set(&DataKey::VaultContractAddr, &vault_contract);
    }

    /// Register the address empowered to resolve disputes for a given
    /// vault. Called once, typically right after `initialize_vault`, by the
    /// vault's creator.
    pub fn assign_dispute_referee(env: Env, vault_id: u32, creator: Address, designated_referee: Address) {
        creator.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::DesignatedReferee(vault_id), &designated_referee);
    }

    /// Normal-path approval: the vault's creator signs off on a stage,
    /// which immediately triggers payout via `vault.payout_completed_stage`.
    pub fn approve_stage_payout(env: Env, vault_id: u32, stage_index: u32, approver: Address) -> bool {
        approver.require_auth();

        let vault_addr = vault_contract_addr(&env);
        let vault = get_vault(&env, &vault_addr, vault_id);

        if approver != vault.creator {
            panic_with_error!(&env, RefereeError::NotCreator);
        }

        let stage = vault
            .stages
            .get(stage_index)
            .unwrap_or_else(|| panic_with_error!(&env, RefereeError::StageOutOfRange));
        if stage.state != StageState::FundedLocked {
            panic_with_error!(&env, RefereeError::InvalidStageState);
        }

        release_stage(&env, &vault_addr, vault_id, stage_index);

        env.events().publish(
            (EVT_REF, symbol_short!("approved")),
            (vault_id, stage_index),
        );
        true
    }

    /// Dispute-path resolution: the designated referee for this vault either
    /// approves the contested stage (triggering payout) or rejects it,
    /// leaving the stage Contested and the funds locked in the vault.
    pub fn adjudicate_stage_contest(
        env: Env,
        vault_id: u32,
        stage_index: u32,
        approve: bool,
        designated_referee: Address,
    ) -> bool {
        designated_referee.require_auth();

        let stored: Address = env
            .storage()
            .persistent()
            .get(&DataKey::DesignatedReferee(vault_id))
            .unwrap_or_else(|| panic_with_error!(&env, RefereeError::NotDesignatedReferee));
        if designated_referee != stored {
            panic_with_error!(&env, RefereeError::NotDesignatedReferee);
        }

        let vault_addr = vault_contract_addr(&env);
        let vault = get_vault(&env, &vault_addr, vault_id);
        let stage = vault
            .stages
            .get(stage_index)
            .unwrap_or_else(|| panic_with_error!(&env, RefereeError::StageOutOfRange));
        if stage.state != StageState::Contested {
            panic_with_error!(&env, RefereeError::InvalidStageState);
        }

        if approve {
            release_stage(&env, &vault_addr, vault_id, stage_index);
        }
        // approve == false: stage stays Contested, funds stay locked.

        env.events().publish(
            (EVT_REF, symbol_short!("resolved")),
            (vault_id, stage_index, approve),
        );
        approve
    }

    /// The designated referee registered for a vault, if any.
    pub fn fetch_assigned_referee(env: Env, vault_id: u32) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::DesignatedReferee(vault_id))
            .unwrap_or_else(|| panic_with_error!(&env, RefereeError::NotDesignatedReferee))
    }
}

fn vault_contract_addr(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::VaultContractAddr)
        .unwrap()
}

fn get_vault(env: &Env, vault_addr: &Address, vault_id: u32) -> PhaseVault {
    let args: Vec<Val> = vec![env, vault_id.into_val(env)];
    env.invoke_contract(vault_addr, &sym_fetch_vault_state(env), args)
}

/// The one call site that reaches into `vault.payout_completed_stage`.
fn release_stage(env: &Env, vault_addr: &Address, vault_id: u32, stage_index: u32) {
    let args: Vec<Val> = vec![env, vault_id.into_val(env), stage_index.into_val(env)];
    env.invoke_contract::<bool>(vault_addr, &sym_payout_completed_stage(env), args);
}

mod test;
