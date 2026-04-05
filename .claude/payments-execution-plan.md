# SquadSwarm Payments — Execution Plan

**Goal:** Real USDC moves through the system on Base Sepolia testnet, with all security fixes applied.

---

## Phase 1: Fix Solidity Contracts (no dependencies)

### 1A: Security fixes in SquadSwarmEscrow.sol
1. Add `arbitrator` address to constructor — only arbitrator can `resolveDispute()`
2. Add `require(upfrontBps <= 10000, "Upfront exceeds 100%")`
3. Add `require(totalAmount > 0, "Zero amount")`
4. Add `require(squad != msg.sender, "Self-dealing")`
5. Restrict `autoSplit()` to `client || squad || arbitrator`
6. Add separate `AutoSplit` event distinct from `DisputeResolved`

### 1B: Security fixes in PaymentSplitter.sol
1. Add `escrowAddress` to constructor — only escrow can call `distribute()`
2. Fix rounding dust — send remainder to last member
3. Add `receive()` fallback that reverts (prevent accidental ETH sends)

### 1C: Update Foundry tests
1. Test all new require guards
2. Test arbitrator-only dispute resolution
3. Test zero-amount rejection
4. Test self-dealing rejection
5. Test upfrontBps > 10000 rejection
6. Test dust-free distribution
7. Test restricted `autoSplit()` and `distribute()`

### 1D: Deploy to Base Sepolia
1. Deploy a mock USDC ERC20 token (mintable for testing)
2. Deploy SquadSwarmEscrow with an arbitrator address
3. Deploy a test PaymentSplitter with 2 test addresses
4. Run full test: create → approve USDC → deposit → milestone → complete → distribute
5. Verify all events emitted correctly
6. Store deployed addresses

---

## Phase 2: Wire Frontend to Real Contracts (depends on Phase 1)

### 2A: Configure environment
1. Set `NEXT_PUBLIC_ESCROW_ADDRESS` from testnet deployment
2. Set `NEXT_PUBLIC_USDC_ADDRESS` (testnet mock USDC)
3. Set `NEXT_PUBLIC_BASE_SEPOLIA_RPC` in wagmi config
4. Switch web3-provider to Base Sepolia (not mainnet)

### 2B: Real deposit flow
Replace mock txHash in contract overview page:
1. Check wallet is connected + on correct chain
2. Call USDC `approve(escrowAddress, totalAmount)` — first wallet popup
3. Wait for approval confirmation
4. Call `depositToEscrow(walletClient, escrowAddress, contractId)` — second wallet popup
5. Wait for deposit confirmation
6. Send REAL txHash to `POST /api/contracts/[id]/deposit`
7. Show Basescan link to the transaction

### 2C: Server-side deposit verification
Update deposit API route:
1. Accept `{ txHash }` as before
2. Use viem `createPublicClient` with Base Sepolia RPC
3. Call `getTransactionReceipt(txHash)`
4. Verify: tx confirmed, `to` is escrow address, logs contain `Deposited` event for correct contractId
5. Only then mark contract as `active`

### 2D: Real completion flow
1. When client clicks "Complete Contract", call `completeEscrow()` on-chain
2. Wait for confirmation
3. Send txHash to `POST /api/contracts/[id]/complete`
4. Server verifies the `Completed` event before marking DB complete

### 2E: Fix deliverable approval auth
1. Only `isClient` can approve deliverables (remove squad member approval)
2. Remove misleading "payment_released" activity log from approve route
3. Real milestone releases happen on completion, not per-deliverable (v1 simplification)

---

## Phase 3: PaymentSplitter Deployment + Squad Claiming (depends on Phase 2)

### 3A: Splitter deployment per contract
1. When a bid is accepted and contract created, deploy a PaymentSplitter
2. Constructor args: squad member wallet addresses + basis point shares from revenue split config
3. Store splitter address in `contracts.smartContractAddress` or new field
4. Pass splitter address when calling `createContract()` on the escrow

### 3B: Squad "Claim Payment" UI
1. On the squad finances page, show pending USDC in the splitter
2. "Distribute Payments" button calls `distribute(USDC_ADDRESS)` on the splitter
3. Shows each member's expected share
4. After distribution, show transaction receipt with Basescan link

---

## Phase 4: End-to-End Testnet Verification

### Full flow test on Base Sepolia:
1. Deploy mock USDC, mint to test client wallet
2. Deploy escrow + splitter
3. Client approves + deposits USDC to escrow
4. Verify upfront payment landed in splitter
5. Complete escrow
6. Verify remaining USDC landed in splitter
7. Call distribute on splitter
8. Verify each member received correct USDC amount
9. Check all events and balances

---

## Execution: 3 Parallel Swarms

```
SWARM A (Solidity): Phase 1A + 1B + 1C     → ~2h
SWARM B (Deploy):   Phase 1D               → ~1h (after Swarm A)
SWARM C (Frontend): Phase 2A + 2B + 2C     → ~3h (after Swarm B)
SEQUENTIAL:         Phase 2D + 2E + 3A + 3B → ~2h (after Swarm C)
VERIFICATION:       Phase 4                 → ~1h (after all)
```

Total: ~6h wall time with parallelization
