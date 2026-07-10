export type StageState = "FundedLocked" | "Disbursed" | "Contested";

export interface VaultStage {
  amount: bigint;
  state: StageState;
}

export interface PhaseVault {
  creator: string;
  recipient: string;
  arbiterContract: string;
  stages: VaultStage[];
  token: string;
}

/** The four distinct error states the UI must surface, per spec Section 4. */
export type AppErrorKind =
  | "wallet-not-found"
  | "signature-rejected"
  | "insufficient-balance"
  | "not-authorized";

export interface AppError {
  kind: AppErrorKind;
  message: string;
}
