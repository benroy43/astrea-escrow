import {
  Contract,
  rpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  Account,
  Keypair,
} from "@stellar/stellar-sdk";
import {
  ARBITER_CONTRACT_ADDRESS,
  ESCROW_CONTRACT_ADDRESS,
  NETWORK_PASSPHRASE,
  STELLAR_RPC_URL,
} from "./env";
import { signTransactionXdr } from "./wallet";
import type { AppError, TrustEscrow, Milestone, MilestoneStatus } from "./types";

const server = new rpc.Server(STELLAR_RPC_URL);

/**
 * Deterministic account public key used for simulateTransaction read-only calls.
 */
const READ_ONLY_SIMULATION_ACCOUNT = Keypair.fromRawEd25519Seed(
  Buffer.alloc(32, 0),
).publicKey();

const ESCROW_AUTH_ERROR_CODES = new Set([10]); // NotAuthorized
const ARBITER_AUTH_ERROR_CODES = new Set([1, 2]); // NotFunder, NotDesignatedMediator

function classifyContractError(rawError: string): AppError["kind"] | null {
  const match = rawError.match(/contract:(C[A-Z2-7]{55}),\s*topics:\[error, Error\(Contract, #(\d+)\)\]/);
  if (!match) return null;
  const [, contractAddress, codeStr] = match;
  const code = Number(codeStr);
  if (contractAddress === ESCROW_CONTRACT_ADDRESS && ESCROW_AUTH_ERROR_CODES.has(code)) {
    return "not-authorized";
  }
  if (contractAddress === ARBITER_CONTRACT_ADDRESS && ARBITER_AUTH_ERROR_CODES.has(code)) {
    return "not-authorized";
  }
  return null;
}

function parseMilestoneState(raw: unknown): MilestoneStatus {
  let tag: unknown = raw;
  if (Array.isArray(tag)) tag = tag[0];
  else if (typeof tag === "object" && tag !== null) tag = (tag as { tag?: string }).tag;
  if (tag === "ActiveSecured" || tag === "Released" || tag === "Challenged") return tag;
  throw new Error(`unrecognized milestone status: ${JSON.stringify(raw)}`);
}

interface RawMilestone {
  tokens_allocated: bigint | number | string;
  status: unknown;
  start_time: bigint | number | string;
  duration: bigint | number | string;
  claimed_amount: bigint | number | string;
}

interface RawEscrow {
  funder: string;
  beneficiary: string;
  mediator_contract: string;
  milestones: RawMilestone[];
  asset: string;
}

function parseEscrow(raw: RawEscrow): TrustEscrow {
  const milestones: Milestone[] = raw.milestones.map((m) => ({
    tokensAllocated: BigInt(m.tokens_allocated),
    status: parseMilestoneState(m.status),
    startTime: BigInt(m.start_time),
    duration: BigInt(m.duration),
    claimedAmount: BigInt(m.claimed_amount),
  }));
  return {
    funder: raw.funder,
    beneficiary: raw.beneficiary,
    mediatorContract: raw.mediator_contract,
    milestones,
    asset: raw.asset,
  };
}

export async function getEscrow(vaultId: number): Promise<TrustEscrow | null> {
  const contract = new Contract(ESCROW_CONTRACT_ADDRESS);
  const sourceAccount = new Account(READ_ONLY_SIMULATION_ACCOUNT, "0");

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("get_escrow_details", nativeToScVal(vaultId, { type: "u32" })))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    if (sim.error.includes("EscrowNotFound") || sim.error.includes("#1")) {
      return null;
    }
    throw new Error(sim.error);
  }
  const result = sim.result?.retval;
  if (!result) return null;
  return parseEscrow(scValToNative(result) as RawEscrow);
}

export async function getEscrowCount(): Promise<number> {
  const contract = new Contract(ESCROW_CONTRACT_ADDRESS);
  const sourceAccount = new Account(READ_ONLY_SIMULATION_ACCOUNT, "0");
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("total_escrows_created"))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return sim.result?.retval ? Number(scValToNative(sim.result.retval)) : 0;
}

async function invokeAsWallet(
  contractAddress: string,
  method: string,
  args: ReturnType<typeof nativeToScVal>[],
  walletAddress: string,
): Promise<{ ok: true; result: unknown } | { error: AppError }> {
  const contract = new Contract(contractAddress);
  const sourceAccount = await server.getAccount(walletAddress);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    if (/insufficient|balance|underfund|account entry is missing/i.test(sim.error)) {
      return {
        error: {
          kind: "insufficient-balance",
          message: "Insufficient XLM balance to cover this transaction.",
        },
      };
    }
    if (classifyContractError(sim.error) === "not-authorized") {
      return {
        error: {
          kind: "not-authorized",
          message:
            "The connected wallet is not authorized to perform this action for this escrow.",
        },
      };
    }
    return {
      error: {
        kind: "not-authorized",
        message: `Transaction simulation failed: ${sim.error}`,
      },
    };
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  const signResult = await signTransactionXdr(prepared.toXDR(), walletAddress);
  if ("error" in signResult) return signResult;

  const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") {
    return {
      error: {
        kind: "not-authorized",
        message: `Transaction rejected: ${JSON.stringify(sendResult.errorResult)}`,
      },
    };
  }

  const finalStatus = await pollTransaction(sendResult.hash);
  if (finalStatus.status !== "SUCCESS") {
    return {
      error: {
        kind: "not-authorized",
        message: `Transaction failed on-chain (status: ${finalStatus.status}).`,
      },
    };
  }
  return { ok: true, result: finalStatus };
}

async function pollTransaction(hash: string, attempts = 15): Promise<rpc.Api.GetTransactionResponse> {
  for (let i = 0; i < attempts; i++) {
    const res = await server.getTransaction(hash);
    if (res.status !== "NOT_FOUND") return res;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Timed out waiting for transaction confirmation.");
}

export async function createEscrow(
  walletAddress: string,
  recipient: string,
  mediatorSigner: string,
  stageAmounts: bigint[],
  stageDurations: bigint[],
): Promise<{ ok: true; vaultId: number } | { error: AppError }> {
  const args = [
    nativeToScVal(Address.fromString(walletAddress)),
    nativeToScVal(Address.fromString(recipient)),
    nativeToScVal(Address.fromString(ARBITER_CONTRACT_ADDRESS)),
    nativeToScVal(stageAmounts, { type: "i128" }),
    nativeToScVal(stageDurations, { type: "u64" }),
  ];
  const res = await invokeAsWallet(ESCROW_CONTRACT_ADDRESS, "create_escrow", args, walletAddress);
  if ("error" in res) return res;

  const count = await getEscrowCount();
  const vaultId = count - 1;
  const regArgs = [
    nativeToScVal(vaultId, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
    nativeToScVal(Address.fromString(mediatorSigner)),
  ];
  const regRes = await invokeAsWallet(
    ARBITER_CONTRACT_ADDRESS,
    "register_mediator",
    regArgs,
    walletAddress,
  );
  if ("error" in regRes) return regRes;

  return { ok: true, vaultId };
}

export async function fundEscrow(
  walletAddress: string,
  vaultId: number,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(vaultId, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
  ];
  const res = await invokeAsWallet(ESCROW_CONTRACT_ADDRESS, "fund_escrow", args, walletAddress);
  if ("error" in res) return res;
  return { ok: true };
}

export async function claimVestedFunds(
  walletAddress: string,
  vaultId: number,
  stageIndex: number,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(vaultId, { type: "u32" }),
    nativeToScVal(stageIndex, { type: "u32" }),
  ];
  const res = await invokeAsWallet(ESCROW_CONTRACT_ADDRESS, "claim_vested_funds", args, walletAddress);
  if ("error" in res) return res;
  return { ok: true };
}

export async function approveMilestoneRelease(
  walletAddress: string,
  vaultId: number,
  stageIndex: number,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(vaultId, { type: "u32" }),
    nativeToScVal(stageIndex, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
  ];
  const res = await invokeAsWallet(
    ARBITER_CONTRACT_ADDRESS,
    "approve_milestone_release",
    args,
    walletAddress,
  );
  if ("error" in res) return res;
  return { ok: true };
}

export async function contestMilestone(
  walletAddress: string,
  vaultId: number,
  stageIndex: number,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(vaultId, { type: "u32" }),
    nativeToScVal(stageIndex, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
  ];
  const res = await invokeAsWallet(ESCROW_CONTRACT_ADDRESS, "contest_milestone", args, walletAddress);
  if ("error" in res) return res;
  return { ok: true };
}

export async function resolveDispute(
  walletAddress: string,
  vaultId: number,
  stageIndex: number,
  approve: boolean,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(vaultId, { type: "u32" }),
    nativeToScVal(stageIndex, { type: "u32" }),
    nativeToScVal(approve),
    nativeToScVal(Address.fromString(walletAddress)),
  ];
  const res = await invokeAsWallet(
    ARBITER_CONTRACT_ADDRESS,
    "resolve_dispute",
    args,
    walletAddress,
  );
  if ("error" in res) return res;
  return { ok: true };
}
