//! Zenith vault contract.
//!
//! Holds funds for a staged project and releases them stage-by-stage.
//! Custody and state transitions live here; the *decision* to release lives in
//! the separate `referee` contract. `payout_completed_stage` can only be invoked by
//! the referee contract registered at creation time, and every release moves
//! tokens out through the token contract (native XLM SAC on testnet), so the
//! full chain is:
//!
//!   referee.approve_stage_payout / adjudicate_stage_contest
//!     -> vault.payout_completed_stage
//!       -> token (SAC) transfer
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, panic_with_error, symbol_short, token, vec, Address,
    Env, IntoVal, Symbol, Val, Vec,
};
use zenith_shared::{PhaseVault, VaultStage, StageState};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum VaultError {
    /// The requested vault id has never been created.
    VaultNotFound = 1,
    /// `initialize_vault` needs at least one stage.
    NoStages = 2,
    /// A stage amount must be a positive number of stroops.
    NonPositiveAmount = 3,
    /// Stage amounts overflowed i128 when summed.
    AmountOverflow = 4,
    /// The vault has already been funded once; it cannot be funded again.
    AlreadyActivated = 5,
    /// Stage actions require the vault to be activated first.
    NotActivated = 6,
    /// stage_index is out of range for this vault.
    StageOutOfRange = 7,
    /// The stage is already Disbursed; funds cannot move twice.
    AlreadyDisbursed = 8,
    /// Only a FundedLocked stage can be contested.
    NotFundedLocked = 9,
    /// The caller is not a participant allowed to perform this action.
    NotAuthorized = 10,
    /// The contract was deployed without a settlement token (constructor not run).
    TokenNotSet = 11,
}

/// Storage keys. Vaults live in persistent storage keyed by id; the id
/// counter lives in instance storage.
#[soroban_sdk::contracttype]
#[derive(Clone)]
enum DataKey {
    /// u32 counter: the next vault id to hand out.
    NextId,
    /// Vault(id) -> PhaseVault
    Vault(u32),
    /// Activated(id) -> bool, set once by activate_vault_capital.
    Activated(u32),
    /// Address of the settlement token (native XLM SAC), set by the constructor.
    Token,
}

const EVT_VAULT: Symbol = symbol_short!("vault");

fn load_vault(env: &Env, vault_id: u32) -> PhaseVault {
    env.storage()
        .persistent()
        .get(&DataKey::Vault(vault_id))
        .unwrap_or_else(|| panic_with_error!(env, VaultError::VaultNotFound))
}

fn save_vault(env: &Env, vault_id: u32, vault: &PhaseVault) {
    env.storage()
        .persistent()
        .set(&DataKey::Vault(vault_id), vault);
}

fn stage_total(env: &Env, stages: &Vec<VaultStage>) -> i128 {
    let mut total: i128 = 0;
    for s in stages.iter() {
        total = total
            .checked_add(s.amount)
            .unwrap_or_else(|| panic_with_error!(env, VaultError::AmountOverflow));
    }
    total
}

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    /// Deploy-time constructor: pin the settlement token (the native XLM SAC
    /// on testnet). Every vault created by this instance settles in it.
    pub fn __constructor(env: Env, token: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
    }

    /// Create a new vault. Stage amounts (stroops) are fixed forever at
    /// this point. Returns the new vault id.
    pub fn initialize_vault(
        env: Env,
        creator: Address,
        recipient: Address,
        arbiter_contract: Address,
        stage_amounts: Vec<i128>,
    ) -> u32 {
        creator.require_auth();

        if stage_amounts.is_empty() {
            panic_with_error!(&env, VaultError::NoStages);
        }

        let mut stages: Vec<VaultStage> = vec![&env];
        for amount in stage_amounts.iter() {
            if amount <= 0 {
                panic_with_error!(&env, VaultError::NonPositiveAmount);
            }
            stages.push_back(VaultStage {
                amount,
                state: StageState::FundedLocked,
            });
        }
        // Reject totals that overflow now rather than at activation time.
        stage_total(&env, &stages);

        let vault = PhaseVault {
            creator,
            recipient,
            arbiter_contract,
            stages,
            token: native_token_address(&env),
        };

        let vault_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0u32);
        env.storage().instance().set(&DataKey::NextId, &(vault_id + 1));
        save_vault(&env, vault_id, &vault);

        env.events().publish(
            (EVT_VAULT, symbol_short!("created")),
            vault_id,
        );
        vault_id
    }

    /// Lock the full project budget into this contract in one transfer. The
    /// amount moved is exactly the sum of the stage amounts fixed at
    /// creation; anything else is impossible by construction, and activation
    /// twice panics.
    pub fn activate_vault_capital(env: Env, vault_id: u32, funder: Address) -> bool {
        funder.require_auth();

        let vault = load_vault(&env, vault_id);
        let activated: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Activated(vault_id))
            .unwrap_or(false);
        if activated {
            panic_with_error!(&env, VaultError::AlreadyActivated);
        }

        let total = stage_total(&env, &vault.stages);
        token::TokenClient::new(&env, &vault.token).transfer(
            &funder,
            &env.current_contract_address(),
            &total,
        );

        env.storage()
            .persistent()
            .set(&DataKey::Activated(vault_id), &true);
        env.events()
            .publish((EVT_VAULT, symbol_short!("funded")), vault_id);
        true
    }

    /// Pay one stage out to the recipient. Only the referee contract
    /// registered for this vault may invoke this: `require_auth` on a
    /// contract address is only satisfied when that contract is the direct
    /// cross-contract invoker, so a direct client call (or a call from any
    /// other contract) fails authorization. A stage that is already
    /// Disbursed can never be paid again.
    pub fn payout_completed_stage(env: Env, vault_id: u32, stage_index: u32) -> bool {
        let mut vault = load_vault(&env, vault_id);

        // Authorization: the registered referee contract must be the invoker.
        vault.arbiter_contract.require_auth();

        let activated: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Activated(vault_id))
            .unwrap_or(false);
        if !activated {
            panic_with_error!(&env, VaultError::NotActivated);
        }

        let mut stage = vault
            .stages
            .get(stage_index)
            .unwrap_or_else(|| panic_with_error!(&env, VaultError::StageOutOfRange));
        if stage.state == StageState::Disbursed {
            panic_with_error!(&env, VaultError::AlreadyDisbursed);
        }

        // Flip state before moving funds so a reentrant call would hit the
        // AlreadyDisbursed guard.
        stage.state = StageState::Disbursed;
        vault.stages.set(stage_index, stage.clone());
        save_vault(&env, vault_id, &vault);

        let args: Vec<Val> = vec![
            &env,
            env.current_contract_address().into_val(&env),
            vault.recipient.into_val(&env),
            stage.amount.into_val(&env),
        ];
        env.invoke_contract::<()>(&vault.token, &symbol_short!("transfer"), args);

        env.events().publish(
            (EVT_VAULT, symbol_short!("released")),
            (vault_id, stage_index),
        );
        true
    }

    /// Flag a FundedLocked stage as Contested. Only the vault's creator or
    /// recipient may do this; `caller` must authorize the call.
    pub fn challenge_stage_delivery(env: Env, vault_id: u32, stage_index: u32, caller: Address) -> bool {
        caller.require_auth();

        let mut vault = load_vault(&env, vault_id);
        if caller != vault.creator && caller != vault.recipient {
            panic_with_error!(&env, VaultError::NotAuthorized);
        }

        let activated: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Activated(vault_id))
            .unwrap_or(false);
        if !activated {
            panic_with_error!(&env, VaultError::NotActivated);
        }

        let mut stage = vault
            .stages
            .get(stage_index)
            .unwrap_or_else(|| panic_with_error!(&env, VaultError::StageOutOfRange));
        if stage.state != StageState::FundedLocked {
            panic_with_error!(&env, VaultError::NotFundedLocked);
        }

        stage.state = StageState::Contested;
        vault.stages.set(stage_index, stage);
        save_vault(&env, vault_id, &vault);

        env.events().publish(
            (EVT_VAULT, symbol_short!("disputed")),
            (vault_id, stage_index),
        );
        true
    }

    /// Read one vault's full state.
    pub fn fetch_vault_state(env: Env, vault_id: u32) -> PhaseVault {
        load_vault(&env, vault_id)
    }

    /// Whether activate_vault_capital has completed for this vault.
    pub fn is_vault_active(env: Env, vault_id: u32) -> bool {
        // Panic with VaultNotFound for unknown ids rather than returning false.
        load_vault(&env, vault_id);
        env.storage()
            .persistent()
            .get(&DataKey::Activated(vault_id))
            .unwrap_or(false)
    }

    /// Number of vaults ever created (ids run 0..count).
    pub fn total_vaults_registered(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0u32)
    }
}

/// The token every vault settles in: the native XLM Stellar Asset Contract
/// on testnet, or whatever token the constructor pinned (tests use a locally
/// registered SAC).
fn native_token_address(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .unwrap_or_else(|| panic_with_error!(env, VaultError::TokenNotSet))
}
