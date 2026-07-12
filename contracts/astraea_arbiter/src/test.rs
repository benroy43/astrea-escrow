#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::StellarAssetClient,
    vec, Address, Env,
};

use crate::{AstraeaArbiter, AstraeaArbiterClient};
use astraea_escrow::{AstraeaEscrow, AstraeaEscrowClient};

struct Harness<'a> {
    env: Env,
    escrow: AstraeaEscrowClient<'a>,
    arbiter: AstraeaArbiterClient<'a>,
    token_admin: StellarAssetClient<'a>,
    token_addr: Address,
    funder: Address,
    beneficiary: Address,
    designated_mediator: Address,
}

fn setup() -> Harness<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin_addr = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin_addr.clone());
    let token_addr = sac.address();
    let token_admin = StellarAssetClient::new(&env, &token_addr);

    let escrow_id = env.register(AstraeaEscrow, (token_addr.clone(),));
    let escrow = AstraeaEscrowClient::new(&env, &escrow_id);

    let arbiter_id = env.register(AstraeaArbiter, (escrow_id.clone(),));
    let arbiter = AstraeaArbiterClient::new(&env, &arbiter_id);

    let funder = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let designated_mediator = Address::generate(&env);

    token_admin.mint(&funder, &1_000_000_000i128);

    Harness {
        env,
        escrow,
        arbiter,
        token_admin,
        token_addr,
        funder,
        beneficiary,
        designated_mediator,
    }
}

/// 1. create_escrow stores milestone details.
#[test]
fn create_escrow_stores_milestones_secured() {
    let h = setup();
    let amounts = vec![&h.env, 100i128, 200i128, 300i128];
    let durations = vec![&h.env, 10u64, 20u64, 30u64];

    let vault_id = h.escrow.create_escrow(
        &h.funder,
        &h.beneficiary,
        &h.arbiter.address,
        &amounts,
        &durations,
    );

    let stored = h.escrow.get_escrow_details(&vault_id);
    assert_eq!(stored.funder, h.funder);
    assert_eq!(stored.beneficiary, h.beneficiary);
    assert_eq!(stored.milestones.len(), 3);
    for (i, (amount, duration)) in [(100i128, 10u64), (200, 20), (300, 30)].into_iter().enumerate() {
        let milestone = stored.milestones.get(i as u32).unwrap();
        assert_eq!(milestone.tokens_allocated, amount);
        assert_eq!(milestone.duration, duration);
        assert_eq!(milestone.status, astraea_shared::MilestoneStatus::ActiveSecured);
    }
}

/// 2. fund_escrow fails if the deposited amount doesn't match the sum of milestone amounts.
#[test]
#[should_panic]
fn fund_escrow_rejects_insufficient_balance() {
    let h = setup();
    let amounts = vec![&h.env, 100i128, 200i128];
    let durations = vec![&h.env, 0u64, 0u64];
    let poor_funder = Address::generate(&h.env);
    let vault_id = h.escrow.create_escrow(&poor_funder, &h.beneficiary, &h.arbiter.address, &amounts, &durations);

    h.token_admin.mint(&poor_funder, &50i128); // less than 300 required
    h.escrow.fund_escrow(&vault_id, &poor_funder);
}

/// 3. release_milestone_funds succeeds only via the registered mediator/arbiter.
#[test]
fn release_milestone_via_arbiter_pays_beneficiary() {
    let h = setup();
    let amounts = vec![&h.env, 400i128, 600i128];
    let durations = vec![&h.env, 0u64, 0u64];
    let vault_id = h.escrow.create_escrow(&h.funder, &h.beneficiary, &h.arbiter.address, &amounts, &durations);
    h.escrow.fund_escrow(&vault_id, &h.funder);
    h.arbiter.register_mediator(&vault_id, &h.funder, &h.designated_mediator);

    let token = soroban_sdk::token::TokenClient::new(&h.env, &h.token_addr);
    let before = token.balance(&h.beneficiary);

    h.arbiter.approve_milestone_release(&vault_id, &0, &h.funder);

    let after = token.balance(&h.beneficiary);
    assert_eq!(after - before, 400i128);

    let stored = h.escrow.get_escrow_details(&vault_id);
    assert_eq!(
        stored.milestones.get(0).unwrap().status,
        astraea_shared::MilestoneStatus::Released
    );
}

/// 4. release_milestone_funds fails when called directly (not via arbiter).
#[test]
#[should_panic]
fn release_milestone_direct_call_fails() {
    let h = setup();
    let amounts = vec![&h.env, 400i128];
    let durations = vec![&h.env, 0u64];
    let vault_id = h.escrow.create_escrow(&h.funder, &h.beneficiary, &h.arbiter.address, &amounts, &durations);
    h.escrow.fund_escrow(&vault_id, &h.funder);

    h.env.set_auths(&[]);
    h.escrow.release_milestone_funds(&vault_id, &0);
}

/// 5. contest_milestone + resolve_dispute(approve: true) transitions Challenged -> Released and pays out.
#[test]
fn dispute_then_resolve_approve_pays_out() {
    let h = setup();
    let amounts = vec![&h.env, 500i128];
    let durations = vec![&h.env, 0u64];
    let vault_id = h.escrow.create_escrow(&h.funder, &h.beneficiary, &h.arbiter.address, &amounts, &durations);
    h.escrow.fund_escrow(&vault_id, &h.funder);
    h.arbiter.register_mediator(&vault_id, &h.funder, &h.designated_mediator);

    h.escrow.contest_milestone(&vault_id, &0, &h.beneficiary);
    let stored = h.escrow.get_escrow_details(&vault_id);
    assert_eq!(
        stored.milestones.get(0).unwrap().status,
        astraea_shared::MilestoneStatus::Challenged
    );

    let token = soroban_sdk::token::TokenClient::new(&h.env, &h.token_addr);
    let before = token.balance(&h.beneficiary);

    let result = h
        .arbiter
        .resolve_dispute(&vault_id, &0, &true, &h.designated_mediator);
    assert!(result);

    let after = token.balance(&h.beneficiary);
    assert_eq!(after - before, 500i128);

    let stored = h.escrow.get_escrow_details(&vault_id);
    assert_eq!(
        stored.milestones.get(0).unwrap().status,
        astraea_shared::MilestoneStatus::Released
    );
}

/// 6. Releasing an already-Released milestone fails (no double payout).
#[test]
#[should_panic]
fn double_release_fails() {
    let h = setup();
    let amounts = vec![&h.env, 250i128];
    let durations = vec![&h.env, 0u64];
    let vault_id = h.escrow.create_escrow(&h.funder, &h.beneficiary, &h.arbiter.address, &amounts, &durations);
    h.escrow.fund_escrow(&vault_id, &h.funder);
    h.arbiter.register_mediator(&vault_id, &h.funder, &h.designated_mediator);

    h.arbiter.approve_milestone_release(&vault_id, &0, &h.funder);
    h.arbiter.approve_milestone_release(&vault_id, &0, &h.funder);
}

/// 7. New: Verify linear vesting claims over time.
#[test]
fn test_linear_vesting_claim() {
    let h = setup();
    let amounts = vec![&h.env, 1000i128];
    let durations = vec![&h.env, 100u64]; // 100 seconds duration

    let vault_id = h.escrow.create_escrow(&h.funder, &h.beneficiary, &h.arbiter.address, &amounts, &durations);
    
    // Set initial timestamp
    h.env.ledger().with_mut(|li| li.timestamp = 1000);
    h.escrow.fund_escrow(&vault_id, &h.funder);

    let token = soroban_sdk::token::TokenClient::new(&h.env, &h.token_addr);
    let before = token.balance(&h.beneficiary);

    // 1. Advance by 25 seconds: 25% vested (250 tokens)
    h.env.ledger().with_mut(|li| li.timestamp = 1025);
    let claimed1 = h.escrow.claim_vested_funds(&vault_id, &0);
    assert!(claimed1);
    assert_eq!(token.balance(&h.beneficiary) - before, 250i128);

    // 2. Advance by another 25 seconds (50s elapsed total): another 25% vested (250 tokens)
    h.env.ledger().with_mut(|li| li.timestamp = 1050);
    let claimed2 = h.escrow.claim_vested_funds(&vault_id, &0);
    assert!(claimed2);
    assert_eq!(token.balance(&h.beneficiary) - before, 500i128);

    // 3. Try claiming without advancing time: should claim 0 and return false
    let claimed3 = h.escrow.claim_vested_funds(&vault_id, &0);
    assert!(!claimed3);
    assert_eq!(token.balance(&h.beneficiary) - before, 500i128);

    // 4. Advance past duration (110s total elapsed): remaining 50% vested (500 tokens)
    h.env.ledger().with_mut(|li| li.timestamp = 1110);
    let claimed4 = h.escrow.claim_vested_funds(&vault_id, &0);
    assert!(claimed4);
    assert_eq!(token.balance(&h.beneficiary) - before, 1000i128);

    // 5. Milestone should now be marked Released
    let stored = h.escrow.get_escrow_details(&vault_id);
    assert_eq!(
        stored.milestones.get(0).unwrap().status,
        astraea_shared::MilestoneStatus::Released
    );
}
