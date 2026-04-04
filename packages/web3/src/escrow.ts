import {
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  encodePacked,
  keccak256,
} from "viem";
import { SQUAD_SWARM_ESCROW_ABI } from "./contracts/SquadSwarmEscrow";
import { PAYMENT_SPLITTER_ABI } from "./contracts/PaymentSplitter";

// Re-export ABIs for convenience
export { SQUAD_SWARM_ESCROW_ABI } from "./contracts/SquadSwarmEscrow";
export { PAYMENT_SPLITTER_ABI } from "./contracts/PaymentSplitter";

// --- Types ---

export enum EscrowStatus {
  Created = 0,
  Funded = 1,
  Active = 2,
  Disputed = 3,
  Completed = 4,
  Cancelled = 5,
}

export interface EscrowContract {
  client: Address;
  squad: Address;
  paymentSplitter: Address;
  token: Address;
  totalAmount: bigint;
  upfrontBps: bigint;
  depositedAmount: bigint;
  releasedAmount: bigint;
  status: EscrowStatus;
  disputeDeadline: bigint;
  defaultClientBps: bigint;
  defaultSquadBps: bigint;
}

// --- Helpers ---

/** Generate a deterministic contract ID from a squad ID and timestamp */
export function generateContractId(squadId: string, timestamp: number): Hex {
  return keccak256(
    encodePacked(["string", "uint256"], [squadId, BigInt(timestamp)])
  );
}

/** Convert a USDC amount (human-readable) to its on-chain representation (6 decimals) */
export function toUSDC(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}

/** Convert an on-chain USDC amount to human-readable */
export function fromUSDC(amount: bigint): number {
  return Number(amount) / 1_000_000;
}

/** Convert a percentage (0-100) to basis points */
export function toBps(percent: number): bigint {
  return BigInt(Math.round(percent * 100));
}

// --- Read Functions ---

export async function getEscrowContract(
  publicClient: PublicClient,
  escrowAddress: Address,
  contractId: Hex
): Promise<EscrowContract> {
  const result = await publicClient.readContract({
    address: escrowAddress,
    abi: SQUAD_SWARM_ESCROW_ABI,
    functionName: "getContract",
    args: [contractId],
  });

  return {
    client: result.client,
    squad: result.squad,
    paymentSplitter: result.paymentSplitter,
    token: result.token,
    totalAmount: result.totalAmount,
    upfrontBps: result.upfrontBps,
    depositedAmount: result.depositedAmount,
    releasedAmount: result.releasedAmount,
    status: Number(result.status) as EscrowStatus,
    disputeDeadline: result.disputeDeadline,
    defaultClientBps: result.defaultClientBps,
    defaultSquadBps: result.defaultSquadBps,
  };
}

export async function getSplitterMembers(
  publicClient: PublicClient,
  splitterAddress: Address
): Promise<{ members: Address[]; shares: bigint[] }> {
  const [members, shares] = await publicClient.readContract({
    address: splitterAddress,
    abi: PAYMENT_SPLITTER_ABI,
    functionName: "getMembers",
  });

  return {
    members: members as Address[],
    shares: shares as bigint[],
  };
}

export async function getPendingPayment(
  publicClient: PublicClient,
  splitterAddress: Address,
  tokenAddress: Address,
  memberAddress: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: splitterAddress,
    abi: PAYMENT_SPLITTER_ABI,
    functionName: "pendingPayment",
    args: [tokenAddress, memberAddress],
  });
}

// --- Write Functions ---

export async function createEscrowContract(
  walletClient: WalletClient,
  escrowAddress: Address,
  params: {
    contractId: Hex;
    squad: Address;
    paymentSplitter: Address;
    token: Address;
    totalAmount: bigint;
    upfrontBps: bigint;
    defaultClientBps: bigint;
    defaultSquadBps: bigint;
  }
) {
  return walletClient.writeContract({
    account: walletClient.account!,
    chain: walletClient.chain!,
    address: escrowAddress,
    abi: SQUAD_SWARM_ESCROW_ABI,
    functionName: "createContract",
    args: [
      params.contractId,
      params.squad,
      params.paymentSplitter,
      params.token,
      params.totalAmount,
      params.upfrontBps,
      params.defaultClientBps,
      params.defaultSquadBps,
    ],
  });
}

export async function depositToEscrow(
  walletClient: WalletClient,
  escrowAddress: Address,
  contractId: Hex
) {
  return walletClient.writeContract({
    account: walletClient.account!,
    chain: walletClient.chain!,
    address: escrowAddress,
    abi: SQUAD_SWARM_ESCROW_ABI,
    functionName: "deposit",
    args: [contractId],
  });
}

export async function releaseMilestone(
  walletClient: WalletClient,
  escrowAddress: Address,
  contractId: Hex,
  amount: bigint
) {
  return walletClient.writeContract({
    account: walletClient.account!,
    chain: walletClient.chain!,
    address: escrowAddress,
    abi: SQUAD_SWARM_ESCROW_ABI,
    functionName: "releaseMilestone",
    args: [contractId, amount],
  });
}

export async function completeEscrow(
  walletClient: WalletClient,
  escrowAddress: Address,
  contractId: Hex
) {
  return walletClient.writeContract({
    account: walletClient.account!,
    chain: walletClient.chain!,
    address: escrowAddress,
    abi: SQUAD_SWARM_ESCROW_ABI,
    functionName: "complete",
    args: [contractId],
  });
}

export async function raiseDispute(
  walletClient: WalletClient,
  escrowAddress: Address,
  contractId: Hex
) {
  return walletClient.writeContract({
    account: walletClient.account!,
    chain: walletClient.chain!,
    address: escrowAddress,
    abi: SQUAD_SWARM_ESCROW_ABI,
    functionName: "raiseDispute",
    args: [contractId],
  });
}

export async function resolveDispute(
  walletClient: WalletClient,
  escrowAddress: Address,
  contractId: Hex,
  clientBps: bigint,
  squadBps: bigint
) {
  return walletClient.writeContract({
    account: walletClient.account!,
    chain: walletClient.chain!,
    address: escrowAddress,
    abi: SQUAD_SWARM_ESCROW_ABI,
    functionName: "resolveDispute",
    args: [contractId, clientBps, squadBps],
  });
}

export async function triggerAutoSplit(
  walletClient: WalletClient,
  escrowAddress: Address,
  contractId: Hex
) {
  return walletClient.writeContract({
    account: walletClient.account!,
    chain: walletClient.chain!,
    address: escrowAddress,
    abi: SQUAD_SWARM_ESCROW_ABI,
    functionName: "autoSplit",
    args: [contractId],
  });
}

export async function distributeSplitterPayments(
  walletClient: WalletClient,
  splitterAddress: Address,
  tokenAddress: Address
) {
  return walletClient.writeContract({
    account: walletClient.account!,
    chain: walletClient.chain!,
    address: splitterAddress,
    abi: PAYMENT_SPLITTER_ABI,
    functionName: "distribute",
    args: [tokenAddress],
  });
}
