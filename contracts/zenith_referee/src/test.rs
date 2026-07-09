#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    token::StellarAssetClient,
    vec, Address, Env,
};

use crate::{RefereeContract, RefereeContractClient};
use zenith_vault::{VaultContract, VaultContractClient};

struct Harness<'a> {
    env: Env,
    vault: VaultContractClient<'a>,
    referee: RefereeContractClient<'a>,
    token_admin: StellarAssetClient<'a>,
    token_addr: Address,
    creator: Address,
    recipient: Address,
    designated_referee: Address,
}

fn setup() -> Harness<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin_addr = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin_addr.clone());
    let token_addr = sac.address();
    let token_admin = StellarAssetClient::new(&env, &token_addr);

    let vault_id = env.register(VaultContract, (token_addr.clone(),));
    let vault = VaultContractClient::new(&env, &vault_id);

    let referee_id = env.register(RefereeContract, (vault_id.clone(),));
    let referee = RefereeContractClient::new(&env, &referee_id);

    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let designated_referee = Address::generate(&env);

    token_admin.mint(&creator, &1_000_000_000i128);

    Harness {
        env,
        vault,
        referee,
        token_admin,
        token_addr,
        creator,
        recipient,
        designated_referee,
    }
}

/// 1. initialize_vault stores stage amounts and FundedLocked state for all.
#[test]
fn initialize_vault_stores_stages_locked() {
    let h = setup();
    let amounts = vec![&h.env, 100i128, 200i128, 300i128];

    let vault_id = h.vault.initialize_vault(
        &h.creator,
        &h.recipient,
        &h.referee.address,
        &amounts,
    );

    let stored = h.vault.fetch_vault_state(&vault_id);
    assert_eq!(stored.creator, h.creator);
    assert_eq!(stored.recipient, h.recipient);
    assert_eq!(stored.stages.len(), 3);
    for (i, amount) in [100i128, 200, 300].into_iter().enumerate() {
        let stage = stored.stages.get(i as u32).unwrap();
        assert_eq!(stage.amount, amount);
        assert_eq!(stage.state, zenith_shared::StageState::FundedLocked);
    }
}

/// 2. activate_vault_capital fails if the deposited amount doesn't match the sum of
///    stage amounts. `activate_vault_capital` takes no separate amount argument --
///    it always transfers exactly `sum(stage_amounts)` fixed at creation,
///    so the mismatch guard is enforced by the SAC transfer itself panicking
///    whenever the funder cannot cover that exact sum.
#[test]
#[should_panic]
fn activate_vault_capital_rejects_mismatched_amount() {
    let h = setup();
    let amounts = vec![&h.env, 100i128, 200i128]; // sum = 300
    let poor_creator = Address::generate(&h.env);
    let vault_id = h.vault.initialize_vault(&poor_creator, &h.recipient, &h.referee.address, &amounts);

    h.token_admin.mint(&poor_creator, &50i128); // less than the required 300
    h.vault.activate_vault_capital(&vault_id, &poor_creator);
}

/// 3. payout_completed_stage succeeds only via the registered referee contract,
///    and correctly transfers funds to the recipient.
#[test]
fn payout_completed_stage_via_referee_pays_recipient() {
    let h = setup();
    let amounts = vec![&h.env, 400i128, 600i128];
    let vault_id = h.vault.initialize_vault(&h.creator, &h.recipient, &h.referee.address, &amounts);
    h.vault.activate_vault_capital(&vault_id, &h.creator);
    h.referee
        .assign_dispute_referee(&vault_id, &h.creator, &h.designated_referee);

    let token = soroban_sdk::token::TokenClient::new(&h.env, &h.token_addr);
    let before = token.balance(&h.recipient);

    h.referee.approve_stage_payout(&vault_id, &0, &h.creator);

    let after = token.balance(&h.recipient);
    assert_eq!(after - before, 400i128);

    let stored = h.vault.fetch_vault_state(&vault_id);
    assert_eq!(
        stored.stages.get(0).unwrap().state,
        zenith_shared::StageState::Disbursed
    );
}

/// 4. payout_completed_stage fails when called directly (not via referee),
///    proving the access control is real.
#[test]
#[should_panic]
fn payout_completed_stage_direct_call_fails() {
    let h = setup();
    let amounts = vec![&h.env, 400i128];
    let vault_id = h.vault.initialize_vault(&h.creator, &h.recipient, &h.referee.address, &amounts);
    h.vault.activate_vault_capital(&vault_id, &h.creator);

    // mock_all_auths() in setup() would rubber-stamp every require_auth call,
    // including this one, which would hide the access-control bug entirely.
    // Clearing the auth mocks here forces a real check: payout_completed_stage
    // calls arbiter_contract.require_auth(), and a top-level client call
    // supplies no authorization entry for that address at all, so it panics.
    h.env.set_auths(&[]);
    h.vault.payout_completed_stage(&vault_id, &0);
}

/// 5. challenge_stage_delivery + adjudicate_stage_contest(approve: true) transitions Contested -> Disbursed and pays out.
#[test]
fn dispute_then_resolve_approve_pays_out() {
    let h = setup();
    let amounts = vec![&h.env, 500i128];
    let vault_id = h.vault.initialize_vault(&h.creator, &h.recipient, &h.referee.address, &amounts);
    h.vault.activate_vault_capital(&vault_id, &h.creator);
    h.referee
        .assign_dispute_referee(&vault_id, &h.creator, &h.designated_referee);

    h.vault.challenge_stage_delivery(&vault_id, &0, &h.recipient);
    let stored = h.vault.fetch_vault_state(&vault_id);
    assert_eq!(
        stored.stages.get(0).unwrap().state,
        zenith_shared::StageState::Contested
    );

    let token = soroban_sdk::token::TokenClient::new(&h.env, &h.token_addr);
    let before = token.balance(&h.recipient);

    let result = h
        .referee
        .adjudicate_stage_contest(&vault_id, &0, &true, &h.designated_referee);
    assert!(result);

    let after = token.balance(&h.recipient);
    assert_eq!(after - before, 500i128);

    let stored = h.vault.fetch_vault_state(&vault_id);
    assert_eq!(
        stored.stages.get(0).unwrap().state,
        zenith_shared::StageState::Disbursed
    );
}

/// 6. Releasing an already-Disbursed stage fails (no double-payout).
#[test]
#[should_panic]
fn double_release_fails() {
    let h = setup();
    let amounts = vec![&h.env, 250i128];
    let vault_id = h.vault.initialize_vault(&h.creator, &h.recipient, &h.referee.address, &amounts);
    h.vault.activate_vault_capital(&vault_id, &h.creator);
    h.referee
        .assign_dispute_referee(&vault_id, &h.creator, &h.designated_referee);

    h.referee.approve_stage_payout(&vault_id, &0, &h.creator);
    // Second approval attempt must panic: stage is no longer FundedLocked.
    h.referee.approve_stage_payout(&vault_id, &0, &h.creator);
}
