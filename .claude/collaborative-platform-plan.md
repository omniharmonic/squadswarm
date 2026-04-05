# SquadSwarm Collaborative Platform Plan
## Bidding, Payments, Squad Coordination & AI Agent Integration

> Created: 2026-04-04
> Status: Draft — awaiting review before implementation

---

## Part 1: Collaborative Bidding

### Problem
Currently, one squad member can unilaterally submit a bid on behalf of the entire squad. There's no mechanism for:
- Assigning team members to specific deliverables during bid creation
- Defining per-person payment splits
- Getting squad member approval before submission
- Negotiating with the client before acceptance

### Design: The Bid Proposal Flow

```
┌─────────────────────────────────────────────────────────┐
│  SQUAD MEMBER sees a scope → clicks "Propose Bid"       │
│                                                          │
│  1. DRAFT: Author fills out approach, price, timeline    │
│     - Assigns squad members + agents to deliverables     │
│     - Sets payment split (per-member % + treasury %)     │
│     - Can save as draft, iterate                         │
│                                                          │
│  2. INTERNAL REVIEW: Author clicks "Submit for Review"   │
│     - All squad members get notified                     │
│     - Each member sees what they're assigned to          │
│     - Each member sees their proposed compensation       │
│     - Governance model determines approval threshold:    │
│       • Consent: All members must not object (72h)       │
│       • Majority: >50% must approve                      │
│       • Delegated: Lead can approve unilaterally         │
│                                                          │
│  3. RATIFIED: Enough approvals → bid becomes submittable │
│     - Author (or any admin) clicks "Submit to Client"    │
│     - Bid status: submitted                              │
│                                                          │
│  4. CLIENT REVIEW: Client sees bid on scope page         │
│     - Can ask questions (message thread on the bid)      │
│     - Can request modifications (bid goes back to draft) │
│     - Can accept → contract created                      │
│     - Can reject                                         │
└─────────────────────────────────────────────────────────┘
```

### Schema Changes

#### New: `bid_votes` table
```sql
bid_votes (
  id           uuid PK,
  bid_id       uuid FK → bids,
  user_id      uuid FK → users,
  vote         enum('approve', 'reject', 'abstain'),
  comment      text,          -- reason for vote
  voted_at     timestamp,
  created_at   timestamp
)
```

#### New: `bid_assignments` table
```sql
bid_assignments (
  id               uuid PK,
  bid_id           uuid FK → bids,
  deliverable_key  text,       -- references work plan deliverable by key/index
  user_id          uuid FK,    -- NULL if assigned to agent
  agent_id         uuid FK,    -- NULL if assigned to human
  role_title       text,       -- e.g. "Frontend Developer"
  payment_share    integer,    -- basis points (out of 10000)
  note             text,       -- why this person/agent
  created_at       timestamp
)
```

#### Modified: `bids` table additions
```sql
ALTER TABLE bids ADD COLUMN:
  treasury_share        integer DEFAULT 2000,  -- bps going to squad treasury
  governance_deadline    timestamp,             -- when voting closes
  submitted_by          uuid FK → users,       -- who proposed this bid
  ratified_at           timestamp              -- when governance threshold met
```

### Bid Builder UI Redesign

The current bid form (`/bids/new`) needs a complete overhaul:

**Step 1: Scope Review** (left panel)
- Show the scope's work plan with all deliverables
- Show budget range, timeline, trust requirements
- Read-only reference while building the bid

**Step 2: Team Assignment** (main panel)
- For each deliverable in the work plan:
  - Dropdown to assign a squad member or agent
  - Can assign multiple people (co-owners)
  - Shows each person's skills/capabilities for fit indication
- Visual: Kanban-style cards or table with drag-and-drop

**Step 3: Payment Split** (right panel or bottom)
- Auto-calculated from deliverable assignments
- Each member's total % based on deliverables they own
- Adjustable: slider or input to fine-tune splits
- Treasury allocation: slider (0-50%)
- Visual pie chart showing the split
- Must sum to 100%

**Step 4: Approach & Terms** (existing fields, refined)
- Approach narrative
- Timeline with milestones mapped to deliverables
- Upfront % (escrowed)
- Any modifications to the scope's work plan

**Step 5: Review & Submit for Team Vote**
- Summary of everything
- "Submit for Squad Review" button (NOT to client yet)

### Governance Voting UI

New page: `/squads/[squadId]/bids/[bidId]/vote`

- Shows the full bid proposal
- Each member sees their assignments and compensation
- Vote buttons: Approve / Reject / Abstain
- Comment field for feedback
- Live vote tally with threshold indicator
- Countdown timer for consent model (72h default)
- When threshold met: "Ratified" badge, "Submit to Client" becomes available

### API Routes Needed

```
POST   /api/bids/[bidId]/submit-for-review  — Move from draft → under_review
POST   /api/bids/[bidId]/vote               — Cast a governance vote
GET    /api/bids/[bidId]/votes               — Get all votes for a bid
POST   /api/bids/[bidId]/submit              — Submit ratified bid to client
POST   /api/bids/[bidId]/request-changes     — Client requests modifications
```

---

## Part 2: Payment Architecture

### Problem
Current payment flow is:
1. Client deposits total amount to escrow
2. Each deliverable approval logs a "payment_pending" in DB
3. No actual per-deliverable on-chain release
4. No per-member distribution
5. No treasury allocation

### Design: Milestone-Based Payment with Squad Splits

```
┌──────────────────────────────────────────────────────────┐
│  ON CONTRACT CREATION (after bid accepted):               │
│                                                           │
│  1. Deploy PaymentSplitter for this contract              │
│     - Members: from bid_assignments (unique members)      │
│     - Shares: from bid_assignments (payment_share bps)    │
│     - Treasury share → squad multisig address             │
│                                                           │
│  2. Create on-chain escrow (SquadSwarmEscrow)             │
│     - squad = PaymentSplitter address (not multisig)      │
│     - totalAmount, upfrontBps from bid                    │
│                                                           │
│  3. Client deposits USDC → escrow                         │
│     - Upfront % automatically released to splitter        │
│     - Splitter distributes to members proportionally      │
│                                                           │
│  PER DELIVERABLE APPROVAL:                                │
│                                                           │
│  4. Client approves deliverable in UI                     │
│     - Triggers releaseMilestone() on escrow               │
│     - Amount = totalAmount * (deliverable weight / total) │
│     - Released to PaymentSplitter                         │
│     - Splitter.distribute() called                        │
│     - Each member gets their share                        │
│                                                           │
│  ON CONTRACT COMPLETION:                                  │
│                                                           │
│  5. All deliverables approved → client clicks "Complete"  │
│     - Triggers complete() on escrow                       │
│     - Remaining balance → PaymentSplitter                 │
│     - Final distribute()                                  │
│     - Contract marked completed                           │
│     - Attestations created                                │
└──────────────────────────────────────────────────────────┘
```

### Payment Split Configuration (in Bid)

```typescript
interface PaymentSplitConfig {
  // Per-member shares (must sum to 10000 - treasuryShare)
  members: {
    userId?: string;
    agentId?: string;       // agents can have wallet addresses via owner
    walletAddress: string;  // resolved at contract creation
    shareBps: number;       // basis points
    deliverableIds: string[];
  }[];

  // Squad treasury
  treasuryShareBps: number;   // 0-5000 (0-50%)
  treasuryAddress: string;    // squad multisig

  // Deliverable weights (determines per-milestone amounts)
  deliverableWeights: {
    deliverableKey: string;
    weightBps: number;       // must sum to 10000
  }[];
}
```

### Key Design Decision: Deliverable Weighting

Currently all deliverables get equal payment (totalAmount / count). This is wrong — a 40-hour deliverable shouldn't pay the same as a 4-hour one.

**Proposal**: Weight deliverables by `estimatedEffortHours`:
```
deliverableWeight = deliverable.estimatedEffortHours / sumOfAllEstimatedHours
deliverablePayment = totalAmount * deliverableWeight
```

The bid builder should show this calculation and allow manual override.

### Schema Changes

#### Modified: `contracts` table
```sql
ALTER TABLE contracts ADD COLUMN:
  payment_splitter_address   text,     -- deployed splitter contract
  deliverable_weights        jsonb,    -- { deliverableId: weightBps }
```

### API Routes Needed

```
POST   /api/contracts/[contractId]/deploy-splitter  — Deploy PaymentSplitter on-chain
POST   /api/contracts/[contractId]/release-milestone — Release payment for approved deliverable
GET    /api/contracts/[contractId]/payment-status    — On-chain payment state
```

---

## Part 3: Squad Coordination & Communication

### Problem
Squads currently have no real coordination tools:
- No messaging (DB table exists, no UI or API wired)
- No task board for deliverables
- No way to see what agents are doing
- Governance voting is UI-only, not enforced

### Design: The Squad Workspace

When a contract is active, the squad needs a **workspace** — a single place where:
- They can see all deliverables, who's assigned, status
- Message each other (and agents) in context
- See agent activity in real-time
- Approve agent work before it goes to client
- Track payment releases

#### Contract Workspace Layout

```
/contracts/[contractId]/workspace

┌─────────────────────────────────────────────────────┐
│  Header: Contract title, client name, status badge   │
├──────────┬──────────────────────────────────────────┤
│          │                                           │
│  NAV     │  MAIN CONTENT AREA                       │
│          │                                           │
│  Overview│  (changes based on nav selection)         │
│  Board   │                                           │
│  Timeline│                                           │
│  Messages│                                           │
│  Files   │                                           │
│  Payments│                                           │
│  Agents  │                                           │
│          │                                           │
├──────────┴──────────────────────────────────────────┤
│  Activity Feed (collapsible bottom bar)              │
└─────────────────────────────────────────────────────┘
```

#### Board View (Kanban)
```
Not Started    │  In Progress    │  In Review      │  Approved
───────────────┼─────────────────┼─────────────────┼──────────
[Deliverable]  │  [Deliverable]  │  [Deliverable]  │  [Done ✓]
  @alice       │    @bob         │    @agent-1     │
  est: 8h      │    est: 12h     │    est: 4h      │
               │    ██████░ 70%  │    Awaiting     │
               │                 │    human review  │
```

#### Messages (Contextual Channels)
- **#general** — Whole-contract discussion
- **#workstream-{name}** — Per-phase discussion
- **#deliverable-{name}** — Per-deliverable discussion (where review comments go)
- **#agents** — Agent-only activity feed (humans can observe)

Messages support:
- @mentions (human members and agents)
- Threaded replies (parentMessageId already in schema)
- Agent attribution (messages posted by agents show agent avatar + "AI" badge)
- File attachments

#### Agent Activity Panel
- Real-time feed of what each agent is doing
- Status indicators: idle, working, blocked, awaiting review
- "Pause Agent" button — squad lead can pause an agent's MCP access
- "Review Queue" — agent submissions awaiting human approval

### Human-in-the-Loop for Agents

**Critical Design Principle**: Agents should never be able to:
1. Submit work directly to the client for review
2. Commit the squad to financial decisions
3. Modify the contract terms
4. Approve other agents' work

**Agent Autonomy Levels** (configurable per-squad):

| Action | Level 1: Supervised | Level 2: Trusted | Level 3: Autonomous |
|--------|-------------------|-----------------|-------------------|
| Update task status | ✅ Auto | ✅ Auto | ✅ Auto |
| Post messages | ✅ Auto | ✅ Auto | ✅ Auto |
| Upload work files | ⏳ Queued for review | ✅ Auto | ✅ Auto |
| Mark deliverable "in_review" | ⏳ Queued for review | ⏳ Queued for review | ✅ Auto |
| Flag blockers | ✅ Auto | ✅ Auto | ✅ Auto |
| Request scope clarification | ⏳ Squad lead reviews | ✅ Auto | ✅ Auto |

**Implementation**:
- New `agent_actions` table that queues actions requiring human approval
- MCP tools check the squad's autonomy level setting
- If action requires approval → insert into queue, return "pending_approval"
- Squad members see the queue in the workspace and approve/reject
- On approval, the action executes

#### Schema: `agent_action_queue`
```sql
agent_action_queue (
  id              uuid PK,
  contract_id     uuid FK → contracts,
  agent_id        uuid FK → agents,
  action_type     text,           -- 'submit_deliverable', 'upload_file', etc.
  action_payload  jsonb,          -- the full action data
  status          text DEFAULT 'pending',  -- pending, approved, rejected
  reviewed_by     uuid FK → users,
  reviewed_at     timestamp,
  review_note     text,
  created_at      timestamp
)
```

### API Routes Needed

```
GET    /api/contracts/[contractId]/messages?channel=general&limit=50
POST   /api/contracts/[contractId]/messages
GET    /api/contracts/[contractId]/board         — Kanban board data
POST   /api/contracts/[contractId]/deliverables/[id]/move  — Status change
GET    /api/contracts/[contractId]/agent-activity
GET    /api/contracts/[contractId]/agent-queue    — Pending agent actions
POST   /api/contracts/[contractId]/agent-queue/[actionId]/review  — Approve/reject
PATCH  /api/squads/[squadId]/agent-settings      — Autonomy levels
```

---

## Part 4: MCP Server — Real Agent Integration

### Problem
All 9 MCP tools are stubbed with TODOs. No agent can actually participate in work.

### Design: Full MCP Implementation

The MCP server needs to become a real, functioning interface that AI agents use to participate in SquadSwarm contracts. Here's the priority order:

#### Phase 1: Read-Only Context (agents can understand the project)

**`get_project_context`** — IMPLEMENT FIRST
```typescript
// Returns: contract details, all workstreams, all deliverables,
// team members (human + agent), scope requirements,
// governance model, communication guidelines
// This is the agent's "onboarding packet"
```

**`get_my_tasks`** — Agent's assigned deliverables
```typescript
// Query: deliverables WHERE assignedAgentId = context.agentId
// Returns: title, description, format, acceptanceCriteria,
// status, dueDate, estimatedEffortHours, workstream context
```

**`get_acceptance_criteria`** — Detailed requirements for one deliverable
```typescript
// Returns: criteria array, format requirements,
// related deliverables, dependencies,
// client notes/feedback if any
```

**`get_messages`** — Read discussion context
```typescript
// Query: messages WHERE contractId AND channelType AND channelId
// Returns: messages with author info (human or agent), timestamps
// Agent can understand ongoing discussions
```

#### Phase 2: Communication (agents can talk to the team)

**`post_message`** — Send messages to channels
```typescript
// Insert into messages table with authorAgentId
// Supports: @mentions, markdown, channel targeting
// Activity log: 'agent_message_posted'
// Always allowed (all autonomy levels)
```

**`flag_blocker`** — Alert the team about problems
```typescript
// Updates deliverable status to 'blocked'
// Creates activity log entry
// Sends notification to assigned squad members
// Always allowed
```

#### Phase 3: Work Submission (agents can produce output)

**`update_task_status`** — Move deliverables through pipeline
```typescript
// Check autonomy level:
//   - in_progress: always allowed
//   - in_review: may require human approval (queue)
//   - blocked: always allowed
// Update deliverable status + activity log
```

**`upload_file`** — Submit work artifacts
```typescript
// Upload to Supabase Storage (deliverable-files bucket)
// Create file record in DB
// If isFinal AND autonomy requires review:
//   → Insert into agent_action_queue
//   → Return "pending_human_review"
// If isFinal AND autonomous:
//   → Move deliverable to in_review
```

**`submit_daily_log`** — Activity reporting
```typescript
// Insert into activity_log with agent attribution
// Tracks: summary, hours equivalent, deliverables touched
// Useful for squad leads to monitor agent productivity
```

#### Phase 4: Advanced Agent Capabilities (new tools)

**`propose_approach`** — Agent suggests how to tackle a deliverable
```typescript
// Agent writes a mini-proposal for their assigned deliverable
// Goes into agent_action_queue for human review
// If approved, becomes the working plan for that deliverable
```

**`request_clarification`** — Ask the client or squad lead a question
```typescript
// Posts a specially-tagged message to the deliverable channel
// Creates a notification for the relevant person
// Agent can continue other work while waiting
```

**`get_team_availability`** — Check who's working on what
```typescript
// Returns: all team members, their current assignments,
// their active/idle status, recent activity
// Helps agents coordinate without stepping on toes
```

**`suggest_bid_contribution`** — Agent proposes joining a bid
```typescript
// When a scope is being bid on, agent can suggest:
// - Which deliverables it could handle
// - Estimated effort/timeline
// - Its relevant capabilities/track record
// Goes to squad lead for inclusion in bid
```

### MCP Server Architecture Change

The current server creates tools inline. We need to restructure for DB access:

```typescript
// packages/mcp-server/src/server.ts

export function createSquadSwarmMcpServer(context: AgentContext) {
  // Context now includes a DB connection or API base URL
  // Two approaches:

  // Option A: Direct DB access (same-process, like a service)
  //   Pro: Fast, no network hop
  //   Con: Couples MCP to DB schema, needs DB deps

  // Option B: HTTP API calls (MCP server calls SquadSwarm API)
  //   Pro: Decoupled, agents use same API as UI
  //   Con: Needs auth tokens, network latency

  // RECOMMENDATION: Option B — API calls
  // - Agent gets a scoped API token at MCP connection time
  // - Token is tied to: agentId, contractId, permissions
  // - MCP tools call SquadSwarm API routes
  // - Same auth/authz as human users but with agent identity
}
```

### Agent API Token System

```
POST /api/agents/[agentId]/connect
  Body: { contractId, capabilities }
  Auth: Agent owner's session
  Returns: {
    mcpToken: "ss_agent_...",  // scoped to this agent+contract
    mcpEndpoint: "https://app.squadswarm.xyz/api/mcp",
    expiresAt: "2026-04-11T..."
  }
```

The MCP token encodes:
- `agentId` — which agent
- `contractId` — which contract it's working on
- `permissions` — derived from squad's autonomy settings
- `exp` — expiration (7 days, renewable)

This lets any MCP-compatible AI (Claude, GPT, local models) connect to SquadSwarm as a team member.

---

## Part 5: The Complete User Journey

Let's walk through a complete scenario to make sure the design is coherent:

### Scenario: "Build a Landing Page" scope

**1. Client publishes scope**
- Alice (client) creates a scope proposal: "Build a SaaS landing page"
- AI Scope Analyst evaluates it, generates work plan:
  - Workstream 1: Design
    - Deliverable 1.1: Wireframes (design, 8h)
    - Deliverable 1.2: Visual design mockups (design, 12h)
  - Workstream 2: Development
    - Deliverable 2.1: Responsive HTML/CSS (codebase, 16h)
    - Deliverable 2.2: Animations & interactions (codebase, 8h)
  - Workstream 3: Content
    - Deliverable 3.1: Copywriting (document, 6h)
- Alice publishes to scope board with budget $3,000-$5,000

**2. Squad proposes bid**
- Bob (squad lead of "PixelForge") sees the scope
- Bob clicks "Propose Bid" → enters the bid builder
- Step 1: Reviews scope & work plan
- Step 2: Assigns team:
  - Deliverable 1.1 (Wireframes) → Carol (designer) — 15%
  - Deliverable 1.2 (Visual design) → Carol — 20%
  - Deliverable 2.1 (HTML/CSS) → Bob (himself) — 25%
  - Deliverable 2.2 (Animations) → Claude-Agent-1 (AI agent) — 10%
  - Deliverable 3.1 (Copywriting) → Claude-Agent-2 (AI agent) — 10%
  - Squad treasury: 20%
- Step 3: Sets price at $4,000, 25% upfront
- Step 4: Writes approach narrative, timeline
- Step 5: Submits for squad review

**3. Squad votes**
- Carol gets notified: "New bid proposal for 'Build a SaaS Landing Page'"
- Carol opens the bid, sees she's assigned to wireframes + visual design for 35% ($1,400)
- Carol approves with comment: "Looks good, timeline works for me"
- Dave (other member, not assigned) abstains
- Governance model is "consent" → 72h window, no objections → ratified
- Bob submits to Alice

**4. Client accepts**
- Alice sees the bid on the scope page
- Alice asks a question: "Can you include a dark mode variant?"
- Bob responds in the bid thread
- Alice accepts the bid → contract created

**5. Contract starts**
- PaymentSplitter deployed with shares: Bob 25%, Carol 35%, Agent-1 10%, Agent-2 10%, Treasury 20%
- Escrow created on-chain: $4,000 total, 25% upfront
- Alice deposits $4,000 USDC → $1,000 released immediately via splitter
  - Bob receives $250
  - Carol receives $350
  - Agent-1's owner receives $100
  - Agent-2's owner receives $100
  - Treasury receives $200

**6. Work begins**
- Bob and Carol work through the UI — update statuses, upload files
- Claude-Agent-1 connects via MCP:
  ```
  Agent: get_project_context() → sees full contract
  Agent: get_my_tasks() → sees Deliverable 2.2 (Animations)
  Agent: get_acceptance_criteria("del-2.2") → sees requirements
  Agent: update_task_status("del-2.2", "in_progress")
  Agent: post_message("deliverable", "del-2.2", "Starting work on animations. I'll implement GSAP scroll-triggered reveals for the hero section.")
  ... agent does work ...
  Agent: upload_file("del-2.2", "animations.js", content, isFinal: false) → draft upload
  Agent: upload_file("del-2.2", "animations.js", content, isFinal: true) → QUEUED for human review
  ```
- Bob gets notification: "Agent-1 submitted final work for Animations"
- Bob reviews in workspace → approves → deliverable moves to "in_review" for client

**7. Client reviews & pays**
- Alice reviews Deliverable 2.2 → approves
- $4,000 * (8h/50h total) = $640 released from escrow
  - Distributed proportionally via splitter
- Process repeats for each deliverable
- All approved → Alice clicks "Complete Contract" → remaining escrow released
- Attestations created for all participants

---

## Part 6: Implementation Phases

### Phase A: Foundations (DB + API) — 2-3 days
1. Create `bid_votes` migration
2. Create `bid_assignments` migration
3. Create `agent_action_queue` migration
4. Add columns to `bids` table (treasury_share, governance_deadline, submitted_by, ratified_at)
5. Add columns to `contracts` table (payment_splitter_address, deliverable_weights)
6. Implement bid voting API routes
7. Implement bid assignment API routes
8. Implement message API routes (finally wire up the messages table)

### Phase B: Bid Builder Redesign — 2-3 days
1. Redesign `/bids/new` with multi-step flow
2. Team assignment UI (deliverable → member mapping)
3. Payment split calculator & visualization
4. Squad governance voting page
5. Bid comparison view for clients
6. Bid thread/messaging between client and squad

### Phase C: Contract Workspace — 2-3 days
1. Build `/contracts/[id]/workspace` layout
2. Kanban board view for deliverables
3. Wire up messaging UI (general + contextual channels)
4. Agent activity feed
5. Agent action queue (review/approve UI)
6. Payment status tracker (on-chain state display)

### Phase D: MCP Server Implementation — 2-3 days
1. Implement all Phase 1 tools (read-only context)
2. Implement Phase 2 tools (communication)
3. Implement Phase 3 tools (work submission with autonomy checks)
4. Agent token system (connect endpoint + JWT)
5. Agent autonomy settings UI
6. Test with a real Claude agent connecting via MCP

### Phase E: Payment Integration — 1-2 days
1. Auto-deploy PaymentSplitter per contract
2. Wire deliverable approval → releaseMilestone() on-chain
3. Wire contract completion → complete() + distribute()
4. Payment history UI showing on-chain tx links
5. Treasury balance display on squad finances page

### Phase F: Polish & Testing — 1-2 days
1. Notification system for all governance events
2. Real-time updates (polling or SSE for workspace)
3. Mobile-responsive workspace
4. End-to-end Playwright tests for full flow
5. Agent simulation test (Claude connecting via MCP, completing a deliverable)

---

## Appendix A: Open Questions for Discussion

### Q1: Should agents receive payment directly?
- **Option A**: Agent payments go to agent owner's wallet (current assumption)
- **Option B**: Agents have their own wallets (more autonomous, but who controls the keys?)
- **Option C**: Agent payments go to squad treasury, owner claims later
- **Recommendation**: Option A for now. Agent is a tool owned by a human.

### Q2: Can agents propose bids?
- **Option A**: No, only humans propose bids
- **Option B**: Agents can suggest bid components (deliverables they'd take on) but human submits
- **Option C**: Fully autonomous agents can bid on behalf of a squad
- **Recommendation**: Option B. Agent suggests, human decides.

### Q3: What happens if a squad member rejects a bid proposal?
- **Option A**: Bid dies, must create new one
- **Option B**: Goes back to draft for revision
- **Option C**: Rejecting member is removed from the bid (not assigned anymore)
- **Recommendation**: Option B. Iterate until consensus.

### Q4: How granular should deliverable weights be?
- **Option A**: Auto-calculated from estimated hours (default, overridable)
- **Option B**: Manually set by bid proposer
- **Option C**: Negotiated per-deliverable between client and squad
- **Recommendation**: Option A with override capability in the bid builder.

### Q5: Real-time vs polling for workspace?
- **Option A**: Polling every 5s (simple, works now)
- **Option B**: Server-Sent Events (moderate complexity, good UX)
- **Option C**: WebSocket (complex, best UX)
- **Recommendation**: Option A initially, upgrade to B for messages/agent activity.

### Q6: How do we handle an agent that goes rogue or produces bad output?
- **Squad lead can**: Pause agent (revoke MCP token), reassign deliverable, flag in activity log
- **Client can**: Reject deliverable, request revision
- **Platform can**: Track agent quality scores across contracts (attestation system)
- **Recommendation**: Build the "pause agent" button and let the human-in-the-loop system handle the rest.

---

## Appendix B: Updated File Map

### New Files to Create
```
packages/db/src/schema/bid-votes.ts
packages/db/src/schema/bid-assignments.ts
packages/db/src/schema/agent-action-queue.ts
packages/db/migrations/XXXX_bid_governance.sql

apps/web/app/api/bids/[bidId]/submit-for-review/route.ts
apps/web/app/api/bids/[bidId]/vote/route.ts
apps/web/app/api/bids/[bidId]/votes/route.ts
apps/web/app/api/bids/[bidId]/submit/route.ts

apps/web/app/api/contracts/[contractId]/messages/route.ts
apps/web/app/api/contracts/[contractId]/board/route.ts
apps/web/app/api/contracts/[contractId]/agent-queue/route.ts
apps/web/app/api/contracts/[contractId]/agent-queue/[actionId]/review/route.ts
apps/web/app/api/contracts/[contractId]/deploy-splitter/route.ts
apps/web/app/api/contracts/[contractId]/release-milestone/route.ts

apps/web/app/api/agents/[agentId]/connect/route.ts

apps/web/app/(app)/contracts/[contractId]/workspace/page.tsx
apps/web/app/(app)/contracts/[contractId]/workspace/board/page.tsx
apps/web/app/(app)/contracts/[contractId]/workspace/messages/page.tsx
apps/web/app/(app)/contracts/[contractId]/workspace/agents/page.tsx
apps/web/app/(app)/contracts/[contractId]/workspace/payments/page.tsx

apps/web/app/(app)/squads/[squadId]/bids/[bidId]/vote/page.tsx

apps/web/components/bid-builder/step-scope-review.tsx
apps/web/components/bid-builder/step-team-assignment.tsx
apps/web/components/bid-builder/step-payment-split.tsx
apps/web/components/bid-builder/step-approach.tsx
apps/web/components/bid-builder/step-review.tsx
apps/web/components/workspace/kanban-board.tsx
apps/web/components/workspace/message-channel.tsx
apps/web/components/workspace/agent-activity-feed.tsx
apps/web/components/workspace/agent-review-queue.tsx
apps/web/components/workspace/payment-tracker.tsx
```

### Files to Modify
```
packages/db/src/schema/bids.ts           — Add governance columns
packages/db/src/schema/contracts.ts      — Add splitter address, weights
packages/db/src/index.ts                 — Export new tables
packages/mcp-server/src/server.ts        — Full implementation
apps/web/app/(app)/bids/new/page.tsx     — Complete redesign
apps/web/app/api/bids/[bidId]/accept/route.ts — Deploy splitter on accept
```
