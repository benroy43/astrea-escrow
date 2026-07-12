export type MilestoneStatus = "ActiveSecured" | "Released" | "Challenged";

export interface Milestone {
  tokensAllocated: bigint;
  status: MilestoneStatus;
  startTime: bigint;
  duration: bigint;
  claimedAmount: bigint;
}

export interface TrustEscrow {
  funder: string;
  beneficiary: string;
  mediatorContract: string;
  milestones: Milestone[];
  asset: string;
}

/** Distinct error states mapped to user actions and exceptions */
export type AppErrorKind =
  | "wallet-not-found"
  | "signature-rejected"
  | "insufficient-balance"
  | "not-authorized";

export interface AppError {
  kind: AppErrorKind;
  message: string;
}
