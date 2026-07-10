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
  REFEREE_CONTRACT_ADDRESS,
  VAULT_CONTRACT_ADDRESS,
  NETWORK_PASSPHRASE,
  STELLAR_RPC_URL,
} from "../utils/env";
import { signTransactionXdr } from "./wallet";
import type { AppError, PhaseVault, VaultStage, StageState } from "../utils/types";

const server = new rpc.Server(STELLAR_RPC_URL);

/**
 * A deterministic, all-zero-seed keypair used only as the `source` for
 * read-only simulateTransaction calls (fetch_vault_state, total_vaults_registered).
 */
const READ_ONLY_SIMULATION_ACCOUNT = Keypair.fromRawEd25519Seed(
  Buffer.alloc(32, 0),
).publicKey();

const VAULT_AUTH_ERROR_CODES = new Set([10]); // NotAuthorized
const REFEREE_AUTH_ERROR_CODES = new Set([1, 2]); // NotCreator, NotDesignatedReferee

function classifyContractError(rawError: string): AppError["kind"] | null {
  const match = rawError.match(/contract:(C[A-Z2-7]{55}),\s*topics:\[error, Error\(Contract, #(\d+)\)\]/);
  if (!match) return null;
  const [, contractAddress, codeStr] = match;
  const code = Number(codeStr);
  if (contractAddress === VAULT_CONTRACT_ADDRESS && VAULT_AUTH_ERROR_CODES.has(code)) {
    return "not-authorized";
  }
  if (contractAddress === REFEREE_CONTRACT_ADDRESS && REFEREE_AUTH_ERROR_CODES.has(code)) {
    return "not-authorized";
  }
  return null;
}

function parseStageState(raw: unknown): StageState {
  let tag: unknown = raw;
  if (Array.isArray(tag)) tag = tag[0];
  else if (typeof tag === "object" && tag !== null) tag = (tag as { tag?: string }).tag;
  if (tag === "FundedLocked" || tag === "Disbursed" || tag === "Contested") return tag;
  throw new Error(`unrecognized stage state: ${JSON.stringify(raw)}`);
}

interface RawVault {
  creator: string;
  recipient: string;
  arbiter_contract: string;
  stages: Array<{ amount: bigint | number | string; state: unknown }>;
  token: string;
}

function parseVault(raw: RawVault): PhaseVault {
  const stages: VaultStage[] = raw.stages.map((s) => ({
    amount: BigInt(s.amount),
    state: parseStageState(s.state),
  }));
  return {
    creator: raw.creator,
    recipient: raw.recipient,
    arbiterContract: raw.arbiter_contract,
    stages,
    token: raw.token,
  };
}

/** Read-only simulate call against `vault.fetch_vault_state`. */
export async function getVault(vaultId: number): Promise<PhaseVault | null> {
  const contract = new Contract(VAULT_CONTRACT_ADDRESS);
  const sourceAccount = new Account(READ_ONLY_SIMULATION_ACCOUNT, "0");

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("fetch_vault_state", nativeToScVal(vaultId, { type: "u32" })))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    if (sim.error.includes("VaultNotFound") || sim.error.includes("#1")) {
      return null;
    }
    throw new Error(sim.error);
  }
  const result = sim.result?.retval;
  if (!result) return null;
  return parseVault(scValToNative(result) as RawVault);
}

export async function getVaultCount(): Promise<number> {
  const contract = new Contract(VAULT_CONTRACT_ADDRESS);
  const sourceAccount = new Account(READ_ONLY_SIMULATION_ACCOUNT, "0");
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("total_vaults_registered"))
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
            "The connected wallet is not authorized to perform this action for this vault.",
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

export async function initializeVault(
  walletAddress: string,
  recipient: string,
  refereeSigner: string,
  stageAmounts: bigint[],
): Promise<{ ok: true; vaultId: number } | { error: AppError }> {
  const args = [
    nativeToScVal(Address.fromString(walletAddress)),
    nativeToScVal(Address.fromString(recipient)),
    nativeToScVal(Address.fromString(REFEREE_CONTRACT_ADDRESS)),
    nativeToScVal(stageAmounts, { type: "i128" }),
  ];
  const res = await invokeAsWallet(VAULT_CONTRACT_ADDRESS, "initialize_vault", args, walletAddress);
  if ("error" in res) return res;

  const count = await getVaultCount();
  const vaultId = count - 1;
  const regArgs = [
    nativeToScVal(vaultId, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
    nativeToScVal(Address.fromString(refereeSigner)),
  ];
  const regRes = await invokeAsWallet(
    REFEREE_CONTRACT_ADDRESS,
    "assign_dispute_referee",
    regArgs,
    walletAddress,
  );
  if ("error" in regRes) return regRes;

  return { ok: true, vaultId };
}

export async function activateVaultCapital(
  walletAddress: string,
  vaultId: number,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(vaultId, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
  ];
  const res = await invokeAsWallet(VAULT_CONTRACT_ADDRESS, "activate_vault_capital", args, walletAddress);
  if ("error" in res) return res;
  return { ok: true };
}

export async function approveStagePayout(
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
    REFEREE_CONTRACT_ADDRESS,
    "approve_stage_payout",
    args,
    walletAddress,
  );
  if ("error" in res) return res;
  return { ok: true };
}

export async function challengeStageDelivery(
  walletAddress: string,
  vaultId: number,
  stageIndex: number,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(vaultId, { type: "u32" }),
    nativeToScVal(stageIndex, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
  ];
  const res = await invokeAsWallet(VAULT_CONTRACT_ADDRESS, "challenge_stage_delivery", args, walletAddress);
  if ("error" in res) return res;
  return { ok: true };
}

export async function adjudicateStageContest(
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
    REFEREE_CONTRACT_ADDRESS,
    "adjudicate_stage_contest",
    args,
    walletAddress,
  );
  if ("error" in res) return res;
  return { ok: true };
}
