# Collaborative Bidding V2: From Top-Down to Organic Negotiation

## The Problem

Current flow: Bob creates a bid → assigns everyone → sets all splits → submits → Carol votes yes/no.

This is broken because:
1. **No agency**: Carol can't say "I'd rather do the frontend" or "I think 16% is low for 52 hours of work"
2. **No negotiation**: The only options are accept or reject the whole thing
3. **No discovery**: Team members can't volunteer for deliverables they're excited about
4. **No counter-proposals**: If Carol disagrees with the split, she has to reject and start over
5. **No partial agreement**: You might agree with 4 of 5 assignments but not the 5th

## The Solution: Bid as Living Document

Instead of one person authoring a complete bid, the bid is a **shared workspace** where squad members collaborate to build the proposal together.

### New Flow: "Scope Discussion → Self-Selection → Negotiation → Consensus"

```
1. INITIATE: Any squad member spots a scope and says "We should bid on this"
   → Creates a "bid discussion" (not a complete bid yet)
   → All squad members get notified
   → Discussion thread opens on the scope

2. CLAIM: Squad members browse the deliverables and "claim" ones they want
   → Each deliverable shows who's interested (can have multiple claimants)
   → Members set their own proposed % for each deliverable they claim
   → Agents can be suggested for deliverables by any member

3. NEGOTIATE: If there are conflicts (two people want the same deliverable,
   or total % exceeds 100%), the team discusses and adjusts
   → Built-in comment thread per deliverable
   → Members can adjust their claims and %
   → Real-time view of the evolving bid state

4. FINALIZE: When all deliverables are claimed and total = 100%,
   anyone can "propose to finalize"
   → Shows the complete bid for review
   → Members confirm or request changes
   → Governance rules apply (consent/majority/delegated)

5. SUBMIT: Once ratified, bid goes to client
```

### Key UX Changes

#### A. Replace "Bid Builder" with "Bid Collaboration Space"

Instead of a 5-step wizard, the bid is a **single page with sections** that everyone can edit simultaneously:

```
/bids/[bidId]/collaborate

┌─────────────────────────────────────────────────────────┐
│  Bid for: Community Seed Library Platform                │
│  Squad: Regenerative Builders      Status: Forming       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  DELIVERABLE CLAIMS                                      │
│  ────────────────────                                    │
│  ┌─ UI/UX Design (24h, design) ─────────────────────┐   │
│  │  👤 Carol Williams — claimed 15%                  │   │
│  │  💬 "This is my specialty, I'd love to lead this" │   │
│  │  [Claim This] [Suggest Agent]                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Seed Catalog API (48h, codebase) ───────────────┐   │
│  │  🤖 CodeCraft AI — suggested by Bob, 12%          │   │
│  │  👤 Bob Martinez — also interested, 15%           │   │
│  │  💬 Bob: "AI can scaffold this, I'll review"      │   │
│  │  💬 Carol: "Makes sense, AI + Bob review"         │   │
│  │  [Claim This] [Suggest Agent]                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Mobile Frontend (52h, codebase) ────────────────┐   │
│  │  ⚪ No claims yet                                 │   │
│  │  [Claim This] [Suggest Agent]                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  SPLIT OVERVIEW                          Total: 72%      │
│  ──────────────                                          │
│  Carol: 15%  │  Bob: 37%  │  AI: 12%  │  Treasury: 20%  │
│  ████░░░░░░  │  ██████░░  │  ██░░░░░  │  ████░░░░░░     │
│  ⚠️ 28% unallocated — 2 deliverables unclaimed          │
│                                                          │
│  APPROACH & TERMS                                        │
│  ─────────────────                                       │
│  [Collaborative text editor — anyone can edit]           │
│  Price: $12,000 [anyone can propose, changes tracked]    │
│  Upfront: 25%                                            │
│                                                          │
│  DISCUSSION                                              │
│  ──────────                                              │
│  [Thread for general bid strategy discussion]            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [Propose to Finalize]  (when all claimed + 100%)│   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### B. Deliverable Claiming System

Each deliverable in the bid has a state:

| State | Meaning |
|-------|---------|
| Unclaimed | No one has volunteered yet |
| Claimed (single) | One person/agent wants it |
| Contested | Multiple people want it — needs resolution |
| Resolved | Team agreed on who does it |

Actions per deliverable:
- **Claim** — "I want to do this" (sets yourself + your proposed %)
- **Unclaim** — "Actually, I changed my mind"
- **Suggest Agent** — "Our AI agent could handle this"
- **Comment** — "I think X should do this because..."
- **Adjust %** — Change your proposed payment share

#### C. Vote Changes: From Binary to Nuanced

Current: Approve / Reject / Abstain

New voting options when someone proposes to finalize:
- **Approve** — "I agree with everything"
- **Approve with note** — "I agree but want to flag X"
- **Request change** — "I want X modified before I approve" (blocks finalization, specific)
- **Block** — "I fundamentally object" (with required reason)

"Request change" is the key addition — it lets someone say "I'm okay with 4/5 of this but want the API deliverable reassigned" without rejecting the entire bid.

#### D. Bid States

```
forming      → Members are claiming deliverables and discussing
proposed     → Someone clicked "Propose to Finalize", team reviewing
changes_requested → A member requested specific changes
ratified     → All members signed off
submitted    → Sent to client
```

### Schema Changes Needed

#### New: `bid_claims` table
```sql
bid_claims (
  id           uuid PK,
  bid_id       uuid FK → bids,
  deliverable_key  text,
  user_id      uuid FK → users (nullable),
  agent_id     uuid FK → agents (nullable),
  proposed_bps integer,        -- what this claimant proposes for their share
  status       text,           -- 'claimed' | 'contested' | 'resolved' | 'withdrawn'
  note         text,           -- why they want this deliverable
  created_at   timestamp,
  updated_at   timestamp
)
```

#### New: `bid_comments` table
```sql
bid_comments (
  id           uuid PK,
  bid_id       uuid FK → bids,
  deliverable_key  text (nullable), -- null = general bid comment
  user_id      uuid FK → users,
  content      text,
  created_at   timestamp
)
```

#### Modified: `bid_votes` — add change_request field
```sql
ALTER TABLE bid_votes ADD COLUMN:
  change_request  text     -- specific change requested (for 'request_change' votes)
```

#### Modified: `bids` — add new statuses
The `status` field already supports text values. New statuses:
- `forming` (replaces `draft` for collaborative bids)
- `proposed` (when someone proposes to finalize)
- `changes_requested` (when a member blocks with specific feedback)

### Implementation Plan

#### Phase 1: Claim System (core mechanic)
1. Create `bid_claims` table + migration
2. Create `bid_comments` table + migration
3. Add `change_request` column to `bid_votes`
4. API: POST/DELETE /api/bids/[bidId]/claims — claim/unclaim deliverables
5. API: GET /api/bids/[bidId]/claims — all claims with user info
6. API: POST /api/bids/[bidId]/comments — per-deliverable comments
7. API: GET /api/bids/[bidId]/comments — all comments

#### Phase 2: Collaboration UI
1. New page: `/bids/[bidId]/collaborate` — the shared bid workspace
2. Deliverable cards with claim buttons, comment threads, % inputs
3. Live split overview (bar chart showing allocation)
4. "Propose to Finalize" button (only active when all claimed + 100%)
5. General discussion thread at bottom

#### Phase 3: Enhanced Voting
1. Update vote API to support 'request_change' with text
2. Update vote page to show change requests
3. When change requested → bid goes back to 'forming' with the feedback visible
4. "Resolve Changes" flow — address feedback and re-propose

#### Phase 4: Initiator Flow
1. Update scope page: "Start a Bid Discussion" instead of "Start a Bid"
2. Creates bid in 'forming' status with no assignments
3. Notifies squad members: "Bob wants to bid on X — claim your deliverables!"
4. Members go to the collaborate page and self-select

### Migration from Current System

The existing 5-step bid builder still works as a fallback:
- Solo squads → use current builder (auto-ratify)
- Delegated governance → squad lead can use current builder
- Consent/majority → use new collaborative flow

The "collaborate" page IS the bid builder for multi-member squads. The old wizard becomes an "express mode" for solo operators.

### What This Enables

1. **"Who wants to do what?"** — Squad lead shares a scope, members claim what excites them
2. **"I think I deserve more"** — Members propose their own % and negotiate
3. **"The AI should do this"** — Anyone can suggest an agent for a deliverable
4. **"I disagree with one thing"** — Request specific changes instead of rejecting everything
5. **"Let me think about it"** — Async, no pressure — claim when ready
6. **Real cooperative governance** — The bid emerges from collective decision-making

### What Stays the Same

- Governance models (consent/majority/delegated) still apply at finalization
- Payment splits still must sum to 100%
- Client still sees a clean, finalized bid
- On-chain escrow + milestone payments unchanged
- MCP agent integration unchanged
