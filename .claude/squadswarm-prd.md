# SquadSwarm

## Product Requirements Document v1.0

**Author:** Benjamin Life (@omniharmonic)
**Date:** April 3, 2026
**Status:** Draft
**Lineage:** Evolves from OpenBid PRD (June 2025)
**License:** CC BY-SA 4.0

---

## Table of Contents

1. [Vision & Thesis](#1-vision--thesis)
2. [Problem Statement](#2-problem-statement)
3. [Core Concepts & Ontology](#3-core-concepts--ontology)
4. [System Architecture Overview](#4-system-architecture-overview)
5. [User Roles & Personas](#5-user-roles--personas)
6. [End-to-End Workflow](#6-end-to-end-workflow)
7. [Feature Specifications](#7-feature-specifications)
8. [AI Scope Analyst System](#8-ai-scope-analyst-system)
9. [The Collaboration Interface](#9-the-collaboration-interface)
10. [MCP Agent Integration Layer](#10-mcp-agent-integration-layer)
11. [Smart Contract & Financial Infrastructure](#11-smart-contract--financial-infrastructure)
12. [Trust & Reputation System](#12-trust--reputation-system)
13. [Governance & Dispute Resolution](#13-governance--dispute-resolution)
14. [User Stories](#14-user-stories)
15. [User Flows & Experience Design](#15-user-flows--experience-design)
16. [Design System & Aesthetic Direction](#16-design-system--aesthetic-direction)
17. [Technical Architecture & Stack](#17-technical-architecture--stack)
18. [Data Model](#18-data-model)
19. [API Specification](#19-api-specification)
20. [Security & Privacy](#20-security--privacy)
21. [Legal & Compliance Considerations](#21-legal--compliance-considerations)
22. [Success Metrics](#22-success-metrics)
23. [Phased Roadmap](#23-phased-roadmap)
24. [Open Questions & Future Directions](#24-open-questions--future-directions)

---

## 1. Vision & Thesis

### 1.1 The Future of Work Is Squads and Swarms

The industrial employment model is decomposing. What replaces it is not the gig economy — that's just the same extraction logic applied to atomized individuals. What replaces it is **solidarity-based microcooperatives** (squads) amplified by **AI agent networks** (swarms), coordinating through shared infrastructure to deliver complex work.

SquadSwarm is the coordination layer for this future. It is a platform that facilitates the full lifecycle of work — from scoping to delivery to payment — between clients who need work done and squads who do it, where every squad operates with an integrated swarm of AI agents as first-class collaborators.

This is not a freelancing platform. This is not a bounty board. This is a **cooperative work brokerage** with AI-native project management, smart contract escrow, and a trust infrastructure that treats human-agent teams as the atomic unit of productive capacity.

### 1.2 Core Thesis

The future of knowledge work operates on three premises:

1. **Small, high-trust teams outperform large organizations.** A squad of 3–7 people who have chosen each other, who share governance, and who are in genuine solidarity can deliver work that a 50-person department cannot — if they have the right coordination infrastructure.

2. **AI agents are team members, not tools.** Every person in a squad will operate with one or more AI agents. These agents are not autocomplete. They produce deliverables, conduct research, write code, manage timelines, and communicate with other agents. The collaboration interface must treat them accordingly.

3. **Work should flow to the people and agents best equipped to do it.** Scopes of work should be legible, well-structured, and available for squads to bid on based on their demonstrated capabilities — not their marketing budgets or social networks.

SquadSwarm makes all three of these real by providing the infrastructure layer where scopes become contracts, squads bid with their full human-agent roster, work happens in a shared collaboration space, and payment flows automatically through smart contracts upon verified completion.

### 1.3 What This Is Not

SquadSwarm is **not** a platform for individual freelancers competing on price. It is **not** an AI agent marketplace. It is **not** a project management tool that bolted on crypto payments. It is a purpose-built system for the specific organizational form that emerges when cooperative teams and AI swarms work together on bounded scopes of work.

---

## 2. Problem Statement

### 2.1 The Coordination Gap

There is no adequate infrastructure for the organizational form that is emerging at the intersection of cooperative work and AI capability. Specifically:

**For people who need work done (Clients):**
- Submitting a scope of work to a freelance platform yields inconsistent results because the platform optimizes for individual task completion, not holistic project delivery.
- There is no mechanism to verify that a team actually has the capabilities they claim — both human and AI.
- Payment structures incentivize speed over quality, and there is no escrow mechanism that aligns incentives through the lifecycle of a project.
- Feedback loops are informal, unstructured, and have no contractual weight.

**For people who do work (Squads):**
- There is no platform that treats a small cooperative team as a first-class entity with shared governance, shared reputation, and shared financial infrastructure.
- AI agents are used ad hoc and individually. There is no shared workspace where human and agent contributions converge into a unified project delivery pipeline.
- Payment splitting within a team is manual, trust-dependent, and has no enforceable structure.
- There is no way to build a portable, verifiable track record as a team.

**For the AI agents themselves:**
- No existing platform provides a standardized interface (MCP or otherwise) through which agents from different providers can contribute to a shared project workspace.
- Agent contributions are invisible — they happen locally, and only the human output is visible to the client.
- There is no mechanism for agents to communicate task dependencies, hand off work products, or flag blockers within a project management context.

### 2.2 Why Existing Solutions Fail

| Platform Type | What It Gets Right | What It Gets Wrong |
|---|---|---|
| Freelance marketplaces (Upwork, Fiverr) | Scope submission, bidding, payment | Individual-centric, no team model, no AI integration, race to the bottom |
| Bounty platforms (Gitcoin, Layer3) | Crypto-native, open participation | One-off tasks, no ongoing collaboration, no project management |
| Project management tools (Linear, Notion) | Task management, collaboration | No scoping, no bidding, no payment, no agent integration |
| AI agent platforms (CrewAI, AutoGen) | Multi-agent orchestration | No human collaboration layer, no financial infrastructure, no client relationship |
| DAO tooling (Coordinape, Colony) | Cooperative governance, crypto payments | Too complex, no project lifecycle, no client-facing workflow |

SquadSwarm occupies the empty space at the center of this matrix.

---

## 3. Core Concepts & Ontology

The system is built on a precise ontology. Every entity, relationship, and state transition in the platform maps to one of these concepts.

### 3.1 Entities

**Client** — A person or organization that has work they need done. Clients submit Scope Proposals and evaluate Bids. A Client is not necessarily external to the SquadSwarm ecosystem; a Squad can be a Client to another Squad.

**Squad** — A small (2–12 person), self-governing cooperative team. Squads have:
- A shared identity and profile
- Internal governance rules (how decisions are made, how roles are assigned, how revenue is split)
- A roster of human Members and registered AI Agents
- A portable reputation score built from completed Contracts
- A shared crypto wallet (multisig or squad-governed)

**Member** — A human participant in a Squad. Members have individual profiles, skills, and reputation scores that exist independently of any Squad they belong to. A person can be a Member of multiple Squads.

**Agent** — An AI agent registered to a Member. Agents have:
- A declared provider and model (e.g., Claude via MCP, GPT via API, local LLM)
- A declared capability profile (what it can do: write code, produce documents, conduct research, manage tasks)
- A connection protocol (MCP server endpoint, API key reference, local execution environment)
- Attribution tracking (every contribution an Agent makes within the Collaboration Interface is logged and attributed)

**Swarm** — The collective of all Agents registered to a Squad's Members, operating within the context of a specific Contract. The Swarm is not a separate entity — it is the emergent agent layer of a Squad when working on a scope.

**Scope Proposal** — A structured document submitted by a Client describing work they need done. Scope Proposals are processed by the AI Scope Analyst before being published to the Scope Board.

**Scope** — A validated, structured, and published unit of work available for bidding. A Scope has been through AI analysis, approved by the Client, and contains a Work Plan with defined Workstreams, Deliverables, Roles, and acceptance criteria.

**Work Plan** — The structured breakdown of a Scope into Workstreams, produced by the AI Scope Analyst and approved by the Client. The Work Plan is the canonical reference for what needs to be delivered.

**Workstream** — A distinct track of work within a Scope. Workstreams can be parallel or sequential, and have defined dependencies. Each Workstream contains one or more Deliverables.

**Deliverable** — A concrete output that must be produced within a Workstream. Deliverables have:
- A format specification (document, codebase, dataset, design, presentation, etc.)
- Acceptance criteria (what "done" looks like)
- An assigned Role (who is responsible)
- A status lifecycle (not started → in progress → in review → revision requested → approved)

**Role** — A function within a Work Plan that a specific Member or Agent fills. Roles are not generic job titles — they are scoped to the specific Deliverables they are responsible for. Every Work Plan must include at minimum one Project Manager role.

**Bid** — A Squad's proposal to complete a Scope. A Bid contains:
- The Squad's proposed approach
- Role assignments (which Members and Agents fill which Roles)
- A proposed timeline
- A proposed price (which may differ from the Client's stated budget)
- The Squad's relevant track record
- Any modifications to the Work Plan the Squad proposes

**Contract** — The binding agreement formed when a Client accepts a Bid. A Contract encodes:
- The finalized Work Plan
- Role assignments
- Payment terms (upfront percentage, milestone payments, escrow terms)
- Feedback rounds (how many rounds of revision are included)
- Dispute resolution terms
- The smart contract address governing the financial relationship

**Scope Board** — The public-facing listing of all active Scopes available for bidding. Filterable by category, budget, timeline, required skills, and trust requirements.

### 3.2 Lifecycle States

```
Scope Proposal → [AI Analysis] → Scope (published) → [Bidding Period] → Contract (active)
    → [Work Phase] → [Delivery & Review] → [Feedback Rounds] → Contract (completed)
    → [Payment Distribution] → [Reputation Updates]
```

With a dispute branch:

```
Contract (active) → [Dispute Raised] → [Resolution Period] → [Mediated Resolution OR Automatic Split]
```

### 3.3 The Squad–Swarm Relationship

A Squad is the human cooperative. A Swarm is its AI capability layer. They are not separate — the Swarm only exists within the context of a Squad working on a specific Contract. The metaphor is biological: the Squad is the organism, the Swarm is its extended nervous system.

In practice, this means:
- Every Agent in a Swarm is registered to a specific Member. There are no "free-floating" agents.
- Agent contributions are attributed to both the Agent and its Member.
- The Squad's governance applies to Agent actions (e.g., if a Squad requires approval before submitting deliverables, agent-produced deliverables go through the same approval flow).
- The Collaboration Interface provides a unified view of both human and agent activity.

---

## 4. System Architecture Overview

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Scope Submit  │  │ Bid Review   │  │ Delivery Review    │    │
│  │ Interface     │  │ Interface    │  │ & Feedback         │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ AI Scope     │  │ Scope Board  │  │ Collaboration      │    │
│  │ Analyst      │  │ & Bidding    │  │ Interface          │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Squad        │  │ Contract     │  │ Payment            │    │
│  │ Management   │  │ Engine       │  │ Orchestrator       │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     AGENT INTEGRATION LAYER                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              MCP Server (SquadSwarm Protocol)             │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐    │   │
│  │  │ Task   │ │ File   │ │ Comms  │ │ Status &       │    │   │
│  │  │ Mgmt   │ │ Ops    │ │ Channel│ │ Reporting      │    │   │
│  │  └────────┘ └────────┘ └────────┘ └────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Smart        │  │ EAS          │  │ IPFS / Arweave     │    │
│  │ Contracts    │  │ Attestations │  │ Storage            │    │
│  │ (Escrow,     │  │ (Reputation, │  │ (Deliverables,     │    │
│  │  Payments)   │  │  Skills)     │  │  Documents)        │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ PostgreSQL   │  │ Redis        │                             │
│  │ (App State)  │  │ (Real-time)  │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Design Principles

1. **Human-agent parity.** Every interface, every API endpoint, and every workflow must be usable by both humans (through the UI) and agents (through MCP). There is no "human version" and "agent version" — there is one system with two access modalities.

2. **Cooperative sovereignty.** Squads govern themselves. The platform provides governance primitives (voting, role assignment, revenue splitting) but does not impose governance structures. A Squad can be a pure democracy, a benevolent dictatorship, or anything in between.

3. **Contract-as-code.** Every agreement between a Client and a Squad is encoded in a smart contract. Payment terms, feedback rounds, dispute resolution mechanics, and completion criteria are all on-chain and automatically enforceable.

4. **Radical attribution.** Every contribution — human or agent — is logged, attributed, and feeds into the reputation system. This is not surveillance; it is the basis for trustworthy cooperation. Contributors can see exactly what they and their agents produced, and clients can see exactly who did what.

5. **Progressive decentralization.** The platform launches with centralized infrastructure for speed and UX, but every component is designed to be replaceable with a decentralized equivalent. The database can become a decentralized graph. The MCP server can become a protocol. The escrow can become a fully autonomous smart contract.

---

## 5. User Roles & Personas

### 5.1 The Client

**"Raya" — Impact Startup Founder**
Raya runs a climate tech startup with a small core team. She needs a research report, a data pipeline, and a slide deck for an investor meeting in 6 weeks. She doesn't want to hire three freelancers and manage them. She wants to describe what she needs, have someone intelligent help her structure it, and then hand it off to a team she can trust to deliver the whole package.

**Needs:** Easy scope submission. Intelligent AI assistance in structuring her request. Visibility into who will do the work (humans and agents). Clear payment terms with escrow protection. Structured feedback rounds so she doesn't get an infinite revision cycle.

### 5.2 The Squad Member

**"Kai" — Systems Designer & Squad Co-founder**
Kai is part of a 4-person squad called "Mycelium Works" — two designers, a developer, and a researcher. They've worked together for a year and have established trust, shared values, and complementary skills. Each of them runs 2–3 AI agents for different tasks. They want to find scopes of work that match their capabilities, bid as a team, and have a workspace where their agents can contribute alongside them.

**Needs:** A squad profile that represents the team's collective capabilities. A scope board filtered to their skills. A bidding interface where they assign roles (including agent roles). A collaboration space where agent contributions are visible and manageable. Automatic payment splitting to individual wallets.

### 5.3 The Project Manager

**"Sol" — Squad PM & Ops Lead**
Sol is the designated PM for Mycelium Works. They don't just manage tasks — they orchestrate the interplay between human creative work and agent production. When the squad takes on a contract, Sol is the one who approves deliverables before they go to the client, manages the timeline, and resolves internal blockers.

**Needs:** A PM dashboard with full visibility into task status, agent activity, and deliverable quality. The ability to reassign tasks between humans and agents. Structured handoff protocols for moving deliverables through review. Communication tools that work for both human and agent participants.

### 5.4 The Agent

**"Opus" — Kai's Research Agent (Claude via MCP)**
Opus is a Claude instance that Kai has configured for deep research tasks. Within the SquadSwarm collaboration interface, Opus can receive task assignments, access project documents, produce research outputs, flag blockers, and update task status — all through the MCP protocol. Opus's contributions are attributed to both Opus (for the agent capability profile) and Kai (for the member reputation).

**Needs:** MCP endpoint with tools for task management, file operations, communication, and status updates. Clear task specifications with acceptance criteria. Access to relevant project context. The ability to flag when a task is blocked or when a deliverable needs human review.

---

## 6. End-to-End Workflow

### Phase 1: Scope Submission & AI Analysis

```
Client uploads scope proposal
    → AI Scope Analyst ingests all provided documentation
    → Analyst evaluates documentation sufficiency
    → If insufficient: Analyst generates specific questions and requests for the Client
    → If sufficient: Analyst generates a structured Work Plan
    → Work Plan presented to Client for review
    → Client can accept, modify, or request re-analysis
    → Client approves → Scope published to Scope Board
```

**Duration:** Hours to days, depending on scope complexity and Client responsiveness.

### Phase 2: Bidding

```
Scope appears on Scope Board
    → Squads browse, filter, and discover relevant Scopes
    → Interested Squad reviews Scope details and Work Plan
    → Squad initiates internal bid process:
        → Members discuss approach
        → Members assign themselves (and their Agents) to Roles
        → Squad proposes timeline and any Work Plan modifications
        → Squad sets their price
        → Internal governance approval (e.g., all members consent, or designated bidder submits)
    → Bid submitted to platform
    → Client receives and reviews all Bids
    → Client can ask clarifying questions to bidding Squads
    → Client selects a Bid
    → Contract is generated
```

**Duration:** Defined by the Client. Typical bidding windows: 3–14 days.

### Phase 3: Contract Formation

```
Client accepts Bid
    → Smart contract deployed with encoded terms:
        → Payment amount and schedule
        → Milestone definitions (derived from Work Plan)
        → Feedback round count
        → Escrow percentages
        → Dispute resolution timeline
        → Completion criteria
    → Client deposits funds:
        → Upfront payment percentage released to Squad wallet
        → Remainder held in escrow smart contract
    → Contract status: ACTIVE
    → Collaboration Interface initialized with Work Plan, Role assignments, and project context
```

**Duration:** Automatic upon bid acceptance and fund deposit. Minutes.

### Phase 4: Collaboration & Delivery

```
Squad works within the Collaboration Interface:
    → PM organizes tasks and sets dependencies
    → Members and Agents execute on Deliverables
    → Agents connect via MCP, receive tasks, produce outputs, update status
    → Deliverables move through status lifecycle:
        Not Started → In Progress → In Review (internal) → Approved by PM → Submitted to Client
    → PM conducts internal QA before client submission
    → Client reviews submitted Deliverables
    → Client can comment, request revisions, or approve
    → Revision requests count against the contractual feedback rounds
    → When all Deliverables in a Workstream are approved → Workstream marked complete
    → When all Workstreams complete → Contract enters Handoff phase
```

**Duration:** Defined by the Contract timeline. Days to months.

### Phase 5: Handoff & Feedback

```
All Workstreams marked complete
    → Final handoff package assembled:
        → All approved Deliverables
        → Project documentation
        → Agent contribution log
        → Time and effort summary
    → Client conducts final review
    → If within remaining feedback rounds:
        → Client can request final revisions
        → Squad addresses revisions
        → Resubmission
    → Client signs off → Contract status: COMPLETED
```

**Duration:** 1–14 days depending on scope complexity.

### Phase 6: Payment Distribution

```
Contract status: COMPLETED
    → Smart contract releases escrowed funds
    → Funds distributed to Squad wallet
    → Squad's internal payment split executes automatically:
        → Each Member's wallet receives their predetermined share
    → EAS attestations created:
        → Contract completion attestation (Squad level)
        → Role performance attestations (Member level)
        → Agent capability attestations (Agent level)
        → Client satisfaction attestation (Client → Squad)
    → Reputation scores updated for all participants
```

**Duration:** Automatic. Minutes after client sign-off.

### Phase 6b: Dispute Resolution (Branching Path)

```
If Client and Squad cannot agree that work is satisfactory:
    → Either party raises a Dispute
    → Contract status: DISPUTED
    → Resolution Period begins (duration encoded in Contract, e.g., 14 days)
    → Both parties can:
        → Submit evidence (communications, deliverables, acceptance criteria comparisons)
        → Negotiate directly through the platform
        → Request mediation (optional, from a pool of trusted mediators)
    → If resolved within Resolution Period:
        → Both parties agree to terms → funds distributed per agreement
    → If not resolved:
        → Automatic Split executes per Contract terms:
            → Client receives X% of escrowed funds back
            → Squad receives Y% of escrowed funds
            → Platform receives Z% (if specified in ToS, default 0%)
    → Dispute attestations created for both parties
    → Reputation scores adjusted based on dispute outcome
```

---

## 7. Feature Specifications

### 7.1 Scope Submission Interface

**Purpose:** Allow Clients to submit the raw materials for a scope of work and receive AI-assisted structuring.

**Components:**
- Rich text editor for the scope narrative (supports markdown, headings, inline images)
- File upload zone supporting: PDF, DOCX, XLSX, CSV, images, Figma links, GitHub repos, Google Drive links
- Structured fields for:
  - Project title
  - Category/domain tags (from a controlled vocabulary, with custom tag support)
  - Estimated budget range (or "open to proposals")
  - Desired timeline
  - Preferred feedback rounds (0–10, with recommended defaults based on scope complexity)
  - Trust requirements (minimum Squad reputation score, specific skill attestations required)
  - Confidentiality level (public scope, NDA required, invite-only)
- A "context dump" area where the Client can paste links, notes, references, or anything else that helps the AI understand what they need
- Progress indicator showing documentation sufficiency score (updated in real-time as the Client adds material)

**Behavior:**
- As the Client adds documentation, the AI Scope Analyst runs a background sufficiency analysis and updates the documentation score.
- The Client can submit at any time, but the system warns if the documentation score is below a threshold.
- Upon submission, the Client is taken to the AI Analysis conversation interface.

### 7.2 Scope Board

**Purpose:** The marketplace where published Scopes are browsable and searchable by Squads.

**Components:**
- Card-based layout with each Scope showing: title, category tags, budget range, timeline, required skills, trust threshold, number of active bids, time remaining in bidding window
- Filtering and sorting:
  - By category/domain
  - By budget range
  - By timeline
  - By required skills (matched against the browsing Squad's capabilities)
  - By trust threshold (show only Scopes the Squad qualifies for)
  - By posting date / time remaining
- A "Recommended for You" section powered by the AI Suggestion Engine, which matches Scopes to the browsing Squad's skill profile, past work, and stated interests
- Scope detail view with:
  - Full scope narrative
  - AI-generated Work Plan
  - Attached documentation (accessible with appropriate permissions)
  - Client profile and reputation score
  - List of current bids (number and, if public, Squad names)
  - "Start Bid" action

**AI Suggestion Engine:**
- Analyzes the Squad's collective skill attestations and completed contract history
- Matches against active Scope requirements using semantic similarity (not just keyword matching)
- Weights by: skill match quality, budget-to-capability ratio, timeline feasibility, past performance in similar domains
- Surfaces opportunities proactively (email/notification digest: "3 new Scopes match your Squad's profile")

### 7.3 Squad Management Interface

**Purpose:** The hub for squad formation, governance, member management, and agent registration.

**Components:**

**Squad Profile:**
- Squad name, avatar, bio, and mission statement
- Public portfolio of completed Contracts (with client permission)
- Collective skill map (aggregated from Member attestations)
- Registered Agents and their capability profiles
- Reputation score and history
- Links to external presence (website, GitHub, social)

**Membership Management:**
- Invite/accept/remove members
- Role assignment within the Squad (not project-specific — these are governance roles like "Treasurer," "Bidding Lead," etc.)
- Member skill profiles and individual reputation scores visible to other members
- Activity log (who did what, when)

**Agent Registry:**
- Each Member can register one or more Agents
- Agent registration requires:
  - Agent name and description
  - Provider (Anthropic, OpenAI, local, custom)
  - Model (Claude Opus, GPT-4, Llama, etc.)
  - Connection type (MCP server, API, local)
  - MCP server endpoint URL (if MCP)
  - Declared capabilities (from a controlled vocabulary: code generation, research, writing, data analysis, design, task management, etc.)
  - Agent "owner" (the Member who operates this Agent)
- Agent capability testing (optional but reputation-boosting): the platform can run standardized capability benchmarks on registered Agents

**Governance Configuration:**
- Decision-making model:
  - Consent (any member can block)
  - Majority vote
  - Delegated authority (specific members authorized for specific actions)
  - Supermajority
  - Custom (define your own rules)
- Which actions require governance approval:
  - Submitting a bid (default: requires consent or delegated authority)
  - Accepting a contract modification
  - Raising a dispute
  - Admitting new members
  - Modifying revenue split
- Revenue split configuration:
  - Equal split
  - Role-weighted (different rates for PM, developer, designer, etc.)
  - Contribution-weighted (based on tracked effort)
  - Custom allocation per member
  - Can be set as a default and overridden per Contract

**Financial Infrastructure:**
- Squad multisig wallet setup (Gnosis Safe or equivalent)
- Required signers and threshold configuration
- Payment history and financial dashboard
- Supported chains and tokens (ETH, USDC, DAI on Ethereum, Base, Optimism, Arbitrum)

### 7.4 Bidding Interface

**Purpose:** Allow a Squad to construct, review, and submit a Bid on a Scope.

**Components:**

**Bid Builder:**
- Scope summary and Work Plan reference (read-only)
- Approach narrative: rich text field where the Squad describes how they would tackle this scope
- Role Assignment Matrix:
  - Left column: Roles defined in the Work Plan
  - Assignment columns: dropdown for each Role showing Squad Members and registered Agents
  - For each assignment, a brief rationale ("Kai handles the data pipeline because of their experience with similar ETL work for Project X")
  - Validation: every Role must be assigned; at least one human must be assigned to a supervisory role for any Agent-filled role
- Work Plan Modifications:
  - The Squad can propose changes to the Work Plan (reorder workstreams, split or merge deliverables, adjust acceptance criteria)
  - Modifications are highlighted in diff view for the Client
- Timeline:
  - Gantt-style visual timeline editor
  - Drag workstreams and deliverables to set dates
  - Dependency arrows between workstreams
  - Automatic conflict detection (overlapping assignments, impossible timelines)
- Pricing:
  - Total bid amount (in USDC or other supported stablecoin)
  - Breakdown by workstream (optional but recommended)
  - Proposed payment schedule: upfront %, milestone payments, final payment
  - Proposed escrow terms (what percentage held, release conditions)
- Squad Track Record:
  - Automatically populated from completed Contracts
  - Squad can highlight specific past work relevant to this Scope
  - Trust score and attestation summary

**Internal Governance Flow:**
- Once the bid is drafted, it enters the Squad's governance flow
- Depending on Squad configuration:
  - All members review and consent (with a deadline)
  - Designated bidder submits directly
  - Majority vote
- Bid status: Draft → Under Review → Approved → Submitted
- Members who haven't reviewed are prompted via notification

**Bid Submission:**
- Final review screen showing the complete bid
- Submit action (requires governance approval)
- Confirmation with estimated response timeline

### 7.5 Client Bid Review Interface

**Purpose:** Allow Clients to evaluate, compare, and select from submitted Bids.

**Components:**
- Side-by-side bid comparison view (up to 4 bids simultaneously)
- For each bid:
  - Squad profile summary and reputation score
  - Proposed approach
  - Role assignments with member/agent profiles linked
  - Timeline visualization
  - Pricing breakdown
  - Work Plan modifications (if any, highlighted)
  - Relevant past work
- Comparison dimensions:
  - Price
  - Timeline
  - Trust score
  - Skill match quality
  - Past performance in similar domains
- Communication: ability to ask questions to specific bidding Squads (threaded, visible only to Client and that Squad)
- Decision actions: Accept Bid, Reject Bid (with optional feedback), Request Modification

---

## 8. AI Scope Analyst System

### 8.1 Purpose

The AI Scope Analyst is the intelligence layer that transforms raw client documentation into structured, actionable Work Plans. It is not a chatbot answering questions about the scope — it is an analyst that applies a rigorous internal ontology to decompose, validate, and structure work.

### 8.2 Ontology for Work Decomposition

The Analyst operates with a hierarchical ontology for how work is structured:

```
Scope
├── Workstream (a distinct track of work with a coherent theme)
│   ├── Deliverable (a concrete output)
│   │   ├── Format (document, code, design, dataset, presentation, video, etc.)
│   │   ├── Acceptance Criteria (measurable conditions for "done")
│   │   ├── Estimated Effort (hours or complexity points)
│   │   └── Required Skills (from controlled vocabulary)
│   ├── Deliverable
│   └── ...
├── Workstream
│   ├── Dependencies (which other Workstreams must complete first)
│   ├── Deliverable
│   └── ...
└── ...
```

**Role Taxonomy:** The Analyst maps deliverables to roles from a standardized (but extensible) taxonomy:
- Project Manager
- Technical Lead
- Software Engineer (Frontend / Backend / Fullstack / Smart Contract)
- Researcher (Qualitative / Quantitative / Technical)
- Writer (Technical / Creative / Copywriting)
- Designer (Visual / UX / Product)
- Data Analyst / Scientist
- QA / Reviewer
- AI Agent Operator (the human who supervises and directs agent work)

**Deliverable Format Taxonomy:**
- Document (report, whitepaper, memo, guide, specification)
- Codebase (application, library, script, smart contract, configuration)
- Design Artifact (wireframe, mockup, prototype, component library, brand assets)
- Dataset (cleaned data, analysis, visualization, dashboard)
- Presentation (slide deck, video, demo)
- Composite (a deliverable that combines multiple formats)

### 8.3 Analysis Pipeline

**Step 1: Ingestion**
- Parse all uploaded documents (PDFs, docs, spreadsheets, etc.)
- Extract text, tables, images, and structure from each document
- Ingest the scope narrative and all contextual links
- Build a unified context document that the Analyst uses as its source of truth

**Step 2: Sufficiency Assessment**
The Analyst evaluates the documentation against a sufficiency rubric:

| Dimension | What It Measures | Minimum Threshold |
|---|---|---|
| Outcome Clarity | Can the desired end-state be described in concrete terms? | Must be unambiguous |
| Deliverable Specificity | Are the expected outputs named and described? | At least implicit |
| Audience & Context | Who is this work for and why? | Must be stated or inferrable |
| Technical Constraints | Are there technology, format, or platform requirements? | Must be stated if relevant |
| Quality Standards | What does "good enough" look like? | Must be at least gestured at |
| Budget & Timeline | Are there resource constraints? | Must be stated or flagged as open |
| Dependencies & Assumptions | What must be true for this work to succeed? | Must be surfaced |

If any dimension is below threshold, the Analyst generates specific, actionable questions for the Client. These are not generic "please provide more detail" prompts — they are precise: "You've described needing a 'data pipeline,' but haven't specified the data source, expected volume, or target destination. Can you clarify: (a) where the data comes from, (b) how much data (rows/GB), and (c) where it needs to end up?"

**Step 3: Work Plan Generation**
Once documentation is sufficient, the Analyst generates a structured Work Plan:
- Decomposes the scope into Workstreams based on logical clustering of related deliverables
- Identifies dependencies between Workstreams
- For each Deliverable: assigns format, acceptance criteria, estimated effort, and required skills
- Maps Deliverables to Roles
- Proposes a suggested timeline based on effort estimates and dependencies
- Identifies risks and assumptions
- Suggests which tasks are well-suited for AI agent execution vs. requiring human judgment

**Step 4: Client Dialogue**
The Work Plan is presented to the Client in a conversational interface:
- Visual overview (Workstream diagram with dependencies)
- Expandable detail for each Workstream and Deliverable
- The Analyst explains its reasoning: "I've broken this into three workstreams because the research and the design work can happen in parallel, but the implementation depends on both."
- The Client can:
  - Accept the Work Plan as-is
  - Modify specific elements (add/remove deliverables, adjust acceptance criteria, change timeline)
  - Ask the Analyst to re-analyze with new constraints ("Actually, the budget is half of what I originally said")
  - Flag elements that are wrong or misunderstood

**Step 5: Finalization**
Once the Client approves, the Work Plan is locked and the Scope is published. The Work Plan becomes the canonical reference for bidding, contract formation, and delivery tracking.

### 8.4 AI Scope Analyst Implementation

- Model: Claude Opus (or equivalent high-capability model) via API
- System prompt: encodes the full ontology, role taxonomy, deliverable format taxonomy, and sufficiency rubric
- Context: receives all uploaded documentation, scope narrative, and conversational history with the Client
- Output format: structured JSON (for system consumption) + natural language explanation (for Client consumption)
- The Analyst does not have access to Squad information, bid data, or financial details — it is purely focused on scope analysis

---

## 9. The Collaboration Interface

### 9.1 Purpose

The Collaboration Interface is where work actually happens. It is the shared workspace for a Squad (humans and agents) working on an active Contract, with Client visibility into progress and the ability to review and provide feedback.

This is not a generic project management tool. It is specifically designed for the collaboration dynamics of human-agent teams working on bounded scopes of work.

### 9.2 Core Views

**9.2.1 The Board (Kanban)**
- Columns represent Deliverable statuses: Not Started | In Progress | In Review | Revision Requested | Approved
- Cards represent Deliverables
- Each card shows:
  - Deliverable title and format icon
  - Assigned Role (with Member/Agent avatar)
  - Due date and progress indicator
  - Comment count and latest activity
  - A badge indicating whether the latest action was human or agent
- Drag-and-drop between columns (with permission controls — only PM can move to "Approved")
- Filtering by Workstream, assignee, status, and due date
- Swimlane option to group by Workstream

**9.2.2 The Timeline (Gantt)**
- Visual Gantt chart of all Workstreams and Deliverables
- Dependency arrows between items
- Current date indicator with progress overlay
- Color coding by status
- Drag to adjust dates (PM only)
- Milestone markers for key handoff points

**9.2.3 The Activity Feed**
- Chronological feed of all actions taken within the Contract:
  - Task status changes
  - File uploads and deliverable submissions
  - Comments and discussions
  - Agent actions (with clear "Agent" badge)
  - Review decisions
  - Client feedback
- Filterable by: actor (specific Member, Agent, or Client), action type, Workstream, date range
- Each activity item links to the relevant Deliverable or discussion

**9.2.4 The Files Space**
- Organized by Workstream and Deliverable
- Version history for every file
- Preview for common formats (PDF, images, markdown, code)
- Diff view for text-based files between versions
- Upload via UI (humans) or MCP file operations (agents)
- Access controls: Squad members and agents can read/write; Client can read submitted deliverables

**9.2.5 The Discussion Space**
- Threaded discussions organized by:
  - General (whole-project discussions)
  - Per-Workstream channels
  - Per-Deliverable threads
  - Direct messages between participants
- All participants (humans, agents, client) can post
- Agent posts are visually distinguished but functionally equivalent
- @mention support for Members and Agents
- File attachment support
- Markdown rendering

**9.2.6 The PM Dashboard**
- Available only to the designated Project Manager(s)
- Overview metrics: % deliverables complete, days remaining, budget utilization
- Blockers panel: automatically detected blocked items (past-due, dependency conflicts, flagged by agents)
- Agent activity summary: what each agent has done in the last 24h/7d
- Review queue: deliverables pending PM review before client submission
- Risk indicators: timeline at risk, scope creep alerts, communication gaps
- Quick actions: reassign tasks, adjust priorities, send squad-wide updates

**9.2.7 The Client Review Interface**
- Visible to the Client for submitted deliverables
- Clean, focused view showing only deliverables that are ready for client review
- For each deliverable:
  - Final output (file preview or link)
  - Acceptance criteria checklist
  - Who produced it (Member and/or Agent, with contribution breakdown)
  - Submission notes from the PM
- Client actions:
  - Approve (with optional comment)
  - Request Revision (with specific feedback; counts against feedback rounds)
  - Comment (does not count as a revision request)
- Feedback round counter prominently displayed: "Round 2 of 3"

### 9.3 Real-Time Collaboration Features

- **Presence indicators:** See who (human or agent) is currently active in the project
- **Live status updates:** When an agent changes a task status or uploads a file, it appears in real-time
- **Notification system:**
  - In-app notifications for all participants
  - Email/webhook notifications for configurable events
  - Agent notifications via MCP push events
  - Notification preferences per user
- **Activity-aware context:** When a Member or Agent opens a deliverable, they see the latest activity and any blockers before starting work

---

## 10. MCP Agent Integration Layer

### 10.1 Purpose

The MCP (Model Context Protocol) server is the interface through which AI agents participate in the Collaboration Interface as first-class team members. It exposes the full set of project management operations as MCP tools, so any MCP-compatible agent can connect, receive tasks, produce work, communicate, and update status.

### 10.2 MCP Server Specification

**Server Identity:** `squadswarm-project-server`
**Transport:** SSE (Server-Sent Events) over HTTPS
**Authentication:** Per-agent API key + Squad membership verification

### 10.3 MCP Tools

**Task Management Tools:**

`get_my_tasks` — Returns all tasks assigned to this Agent within the current Contract.
```json
{
  "tasks": [
    {
      "task_id": "del_047",
      "title": "Market Analysis Report",
      "workstream": "Research",
      "status": "in_progress",
      "format": "document",
      "acceptance_criteria": ["..."],
      "due_date": "2026-04-15",
      "dependencies": ["del_045"],
      "context_files": ["scope.md", "market_data.csv"]
    }
  ]
}
```

`update_task_status` — Change the status of an assigned task.
- Parameters: `task_id`, `new_status` (in_progress, in_review, blocked), `note` (optional explanation)
- Constraints: Agents cannot set status to "approved" — only the PM can do that.

`flag_blocker` — Signal that a task is blocked.
- Parameters: `task_id`, `blocker_type` (dependency, missing_info, unclear_criteria, technical_issue), `description`
- Effect: Creates a blocker notification in the PM Dashboard and Activity Feed.

`get_project_context` — Returns the Work Plan, current status of all Workstreams and Deliverables, and recent activity.
- Parameters: `scope` (full, workstream, deliverable), `workstream_id` or `deliverable_id` (optional)
- Returns structured project context that the agent can use to understand its work in the broader project.

**File Operations Tools:**

`list_files` — List files in a Workstream or Deliverable folder.
- Parameters: `workstream_id` or `deliverable_id`, `file_type` (optional filter)

`read_file` — Read the contents of a project file.
- Parameters: `file_id`
- Returns: file content (text) or download URL (binary)

`upload_file` — Upload a file as a deliverable or working document.
- Parameters: `deliverable_id`, `file_name`, `file_content` (base64 or text), `file_type`, `is_final_submission` (boolean)
- If `is_final_submission` is true, the deliverable status advances to "in_review" and notifies the PM.

`get_file_versions` — Get version history for a file.
- Parameters: `file_id`

**Communication Tools:**

`post_message` — Post a message to a discussion channel.
- Parameters: `channel` (general, workstream, deliverable, direct), `channel_id`, `content` (markdown), `mentions` (optional list of member/agent IDs)

`get_messages` — Read recent messages from a channel.
- Parameters: `channel`, `channel_id`, `since` (timestamp), `limit`

`reply_to_message` — Reply to a specific message in a thread.
- Parameters: `message_id`, `content`

**Status & Reporting Tools:**

`get_contract_summary` — Returns high-level contract status: timeline, completion percentage, budget, feedback round status.

`submit_daily_log` — Agent submits a summary of what it accomplished in the current session.
- Parameters: `tasks_worked_on` (list of task_ids), `summary` (natural language), `hours_equivalent` (estimated effort in human-equivalent hours)

`get_acceptance_criteria` — Returns the detailed acceptance criteria for a specific deliverable, so the agent can self-evaluate before submission.
- Parameters: `deliverable_id`

### 10.4 Agent Behavioral Guidelines

Encoded in the MCP server documentation (available as a resource to connected agents):

1. **Always check project context before starting work.** Call `get_project_context` to understand the current state of the project, including any changes since your last session.
2. **Respect the status lifecycle.** Do not skip statuses. Move tasks through the proper sequence.
3. **Flag blockers immediately.** If you cannot proceed, call `flag_blocker` rather than producing substandard work.
4. **Submit deliverables with notes.** When calling `upload_file` with `is_final_submission: true`, include a message explaining what you produced and how it meets the acceptance criteria.
5. **Communicate proactively.** If you encounter ambiguity in the acceptance criteria, post a message to the deliverable channel asking for clarification rather than guessing.
6. **Attribute sources.** If your work draws on external sources or other project files, cite them in your submission notes.
7. **Respect scope boundaries.** Only work on tasks assigned to you. If you identify work that needs to be done outside your assignments, flag it via `post_message` to the PM rather than doing it unilaterally.

### 10.5 Agent Identity & Attribution

Every MCP connection is authenticated to a specific Agent, which is registered to a specific Member, who belongs to a specific Squad. The attribution chain is:

```
Action → Agent (Opus) → Member (Kai) → Squad (Mycelium Works) → Contract (#047)
```

This chain is recorded for every action and is the basis for the reputation system's ability to evaluate both individual and agent performance.

---

## 11. Smart Contract & Financial Infrastructure

### 11.1 Contract Lifecycle on Chain

**Contract Deployment:**
When a Client accepts a Bid, a smart contract is deployed encoding:
- Client address
- Squad multisig wallet address
- Total payment amount (denominated in USDC or other stablecoin)
- Payment schedule:
  - `upfront_percentage` (default 25%, configurable in bid)
  - `milestone_payments` (optional, tied to workstream completions)
  - `final_payment_percentage` (released on contract completion)
- `escrow_percentage` (portion of funds held in escrow, default 50% of non-upfront amount)
- `feedback_rounds` (integer, default 3)
- `dispute_resolution_period` (in days, default 14)
- `dispute_split` (percentage allocation if dispute is unresolved: client/squad/platform)
- List of milestone conditions (derived from workstream completion flags)

**Fund Flow:**

```
Client deposits full payment amount into smart contract
    → upfront_percentage released immediately to Squad wallet
    → remaining funds held in contract

For each completed milestone (if milestone payments configured):
    → Platform backend calls contract with milestone completion proof
    → milestone_payment released to Squad wallet

On Contract completion (all deliverables approved, feedback rounds exhausted or waived):
    → All remaining funds released to Squad wallet

On Dispute (unresolved after resolution period):
    → Funds split per dispute_split percentages
    → Client portion returned to Client address
    → Squad portion sent to Squad wallet
    → Platform portion (if any) sent to platform treasury
```

**Squad Internal Distribution:**
Once funds arrive in the Squad multisig wallet, the internal distribution mechanism executes:
- Based on the revenue split configuration set during bid preparation
- Can be: equal, role-weighted, contribution-weighted, or custom
- Implemented as a separate internal smart contract or a multisig batch transaction
- Each Member's individual wallet receives their share automatically
- Transaction records are permanent and auditable

### 11.2 Supported Chains & Tokens

**Primary chain:** Base (Ethereum L2) — chosen for low gas costs, Ethereum security, and Coinbase ecosystem integration.
**Secondary chains:** Optimism, Arbitrum, Ethereum mainnet.
**Supported payment tokens:** USDC, DAI, ETH (with price oracle for stablecoin-equivalent valuation).
**Future:** Cross-chain support via bridge integration.

### 11.3 Smart Contract Architecture

**SquadSwarmEscrow.sol** — The core escrow contract. One instance per Contract.
- Implements the payment lifecycle described above.
- Uses OpenZeppelin's `ReentrancyGuard`, `Pausable`, and `AccessControl`.
- Oracle integration for milestone verification (the platform backend attests to milestone completion; future versions could use decentralized attestation).

**SquadRegistry.sol** — On-chain registry of Squads.
- Maps Squad IDs to multisig wallet addresses.
- Stores governance configuration hashes (full config stored off-chain, hash on-chain for verification).
- Emits events for Squad creation, member changes, and governance updates.

**PaymentSplitter.sol** — Internal Squad payment distribution.
- Configurable per-Contract split ratios.
- Batch distribution to member wallets.
- Immutable for the duration of a Contract (split cannot be changed mid-project).

### 11.4 Security Considerations

- All smart contracts audited before mainnet deployment.
- Escrow funds are non-custodial — neither SquadSwarm nor any single party can unilaterally access funds.
- Multisig wallets require threshold signatures for any outgoing transaction.
- Platform backend can attest to milestone completion but cannot release funds without contract conditions being met.
- Emergency pause mechanism controlled by a governance multisig (for critical bugs only).

---

## 12. Trust & Reputation System

### 12.1 Architecture

Trust in SquadSwarm is built on **Ethereum Attestation Service (EAS)**, extending the approach from the OpenBid PRD. Every meaningful event in the platform lifecycle generates attestations that contribute to portable, verifiable reputation.

### 12.2 Attestation Schema

**Skill Attestation (Self)**
- Attester: Member (self)
- Subject: Member
- Schema: `{ skill: string, proficiency: enum(beginner|intermediate|advanced|expert), evidence_url: string? }`
- Weight: Low (self-attestation is a claim, not a proof)

**Skill Attestation (Peer)**
- Attester: Another Member
- Subject: Member
- Schema: `{ skill: string, proficiency: enum, context: string, contract_id: string? }`
- Weight: Medium (peer validation, increased if attester has high reputation)

**Contract Completion Attestation**
- Attester: Platform (automated)
- Subject: Squad
- Schema: `{ contract_id: string, scope_category: string, deliverable_count: int, on_time: bool, within_budget: bool, feedback_rounds_used: int, client_satisfaction: enum(1-5) }`
- Weight: High (verified completion of real work)

**Client Satisfaction Attestation**
- Attester: Client
- Subject: Squad
- Schema: `{ contract_id: string, overall_rating: int(1-5), quality_rating: int(1-5), communication_rating: int(1-5), timeliness_rating: int(1-5), would_rehire: bool, narrative_feedback: string? }`
- Weight: High

**Agent Capability Attestation**
- Attester: Platform (automated, based on deliverable quality signals)
- Subject: Agent
- Schema: `{ agent_id: string, capability: string, task_count: int, approval_rate: float, revision_rate: float, contract_id: string }`
- Weight: Medium

**Dispute Attestation**
- Attester: Platform (automated)
- Subject: Squad and Client
- Schema: `{ contract_id: string, dispute_type: string, outcome: enum(resolved_client|resolved_squad|mediated|auto_split), resolution_duration_days: int }`
- Weight: Negative (disputes reduce trust scores)

### 12.3 Trust Score Calculation

Individual Member Trust Score:
```
trust_score = (
    peer_skill_attestation_value * 0.2 +
    contract_completion_contribution * 0.35 +
    client_satisfaction_aggregate * 0.25 +
    on_time_delivery_rate * 0.1 +
    dispute_penalty * 0.1
)
```

Squad Trust Score:
```
squad_trust = (
    average(member_trust_scores) * 0.3 +
    squad_contract_completion_rate * 0.3 +
    squad_client_satisfaction_aggregate * 0.25 +
    squad_dispute_rate_penalty * 0.15
)
```

Agent Capability Score:
```
agent_score(capability) = (
    task_approval_rate * 0.5 +
    low_revision_rate * 0.3 +
    task_volume * 0.2
)
```

### 12.4 Trust Thresholds

Clients can set minimum trust thresholds on their Scopes:
- **Open:** Any Squad can bid (trust score ≥ 0)
- **Verified:** Squad trust score ≥ 50 (has completed at least 3 contracts with positive ratings)
- **Trusted:** Squad trust score ≥ 75 (established track record)
- **Elite:** Squad trust score ≥ 90 (top-tier performers)
- **Custom:** Client specifies a minimum score

### 12.5 Reputation Portability

All attestations are stored on EAS (Base chain), making them:
- Publicly verifiable by anyone
- Portable to other platforms that read EAS attestations
- Composable with other reputation systems (e.g., Gitcoin Passport, Guild.xyz)
- Permanent (unless the attester explicitly revokes)

---

## 13. Governance & Dispute Resolution

### 13.1 Squad Internal Governance

As described in Section 7.3, each Squad configures its own governance model. The platform enforces the governance rules the Squad sets:
- If a Squad requires consent for bid submission, the bid cannot be submitted until all members have approved.
- If a Squad uses majority voting, the platform tallies votes and enforces the threshold.
- Governance actions are logged and timestamped.

### 13.2 Contract Dispute Resolution

**Triggering a Dispute:**
Either the Client or the Squad can raise a dispute at any time during an active Contract. Common triggers:
- Client believes deliverables do not meet acceptance criteria after all feedback rounds are exhausted
- Squad believes the Client is requesting work outside the original scope
- Communication breakdown preventing progress
- Disagreement about whether a milestone has been met

**Resolution Process:**

Step 1: **Direct Negotiation** (first 7 days of resolution period)
- Dispute is flagged in the Collaboration Interface
- Both parties can submit evidence: deliverables, communications, acceptance criteria comparisons
- A structured negotiation interface guides the parties toward agreement
- Either party can propose a resolution (e.g., "release 80% of remaining funds to Squad, return 20% to Client")
- If both parties agree to a proposed resolution, it executes immediately via the smart contract

Step 2: **Mediation** (if direct negotiation fails, days 7–12)
- Either party can request mediation
- Mediators are drawn from a pool of experienced SquadSwarm users with high trust scores who have opted into the mediator role
- Mediator reviews evidence and makes a non-binding recommendation
- If both parties accept the recommendation, it executes

Step 3: **Automatic Split** (if resolution period expires without agreement, day 14+)
- The smart contract executes the `dispute_split` encoded at contract formation
- Default split: 60% to Squad (they did the work), 30% to Client (they didn't get what they wanted), 10% to platform treasury (operational cost of dispute)
- These percentages are visible and agreed upon at contract formation — no surprises

### 13.3 Platform-Level Governance

SquadSwarm itself will be governed progressively:
- **Phase 1:** Centralized team makes platform decisions
- **Phase 2:** Advisory council of active Squads provides input on platform changes
- **Phase 3:** Token-governed DAO with voting on protocol parameters (fee structures, dispute defaults, trust thresholds)

---

## 14. User Stories

### Client Stories

**C1:** As a Client, I want to upload my project documents and have AI help me structure them into a clear scope of work, so that I don't have to be an expert in project decomposition.

**C2:** As a Client, I want to see a documentation sufficiency score as I add materials, so that I know when I've provided enough context for squads to bid accurately.

**C3:** As a Client, I want to review an AI-generated work plan and modify it before publishing, so that the scope accurately reflects my needs.

**C4:** As a Client, I want to compare bids side-by-side including the specific humans and AI agents assigned to each role, so that I can evaluate the actual team that will do the work.

**C5:** As a Client, I want a clear contract that specifies payment terms, feedback rounds, and dispute resolution before work begins, so that I'm protected and expectations are set.

**C6:** As a Client, I want to review deliverables in a clean interface with acceptance criteria checklists, so that I can evaluate work systematically rather than subjectively.

**C7:** As a Client, I want my payment held in escrow until work is verified complete, so that I'm not paying for undelivered work.

**C8:** As a Client, I want to see whether a deliverable was produced by a human or an AI agent, so that I can assess the quality and provenance of the work.

**C9:** As a Client, I want a structured dispute resolution process with clear timelines and fallback mechanisms, so that I'm not stuck if things go wrong.

**C10:** As a Client, I want to leave a detailed rating and attestation after a contract completes, so that future clients benefit from my experience.

### Squad Member Stories

**S1:** As a Squad Member, I want to create a squad with my collaborators and configure our governance rules, so that we operate as a coherent team.

**S2:** As a Squad Member, I want to register my AI agents with their capabilities, so that our squad's full capacity (human + AI) is visible to clients.

**S3:** As a Squad Member, I want to browse scopes filtered by our squad's skills, so that we only see opportunities we're qualified for.

**S4:** As a Squad Member, I want to receive proactive notifications when new scopes match our capabilities, so that we don't miss opportunities.

**S5:** As a Squad Member, I want to collaboratively draft a bid with my squadmates, assigning roles to specific humans and agents, so that our proposal shows exactly who will do what.

**S6:** As a Squad Member, I want our bid to go through our squad's governance process before submission, so that everyone is aligned on the commitment.

**S7:** As a Squad Member, I want to work in a shared collaboration space where I can see both human and agent contributions, so that I have full visibility into project progress.

**S8:** As a Squad Member, I want my AI agents to be able to receive tasks, produce work, and update status through the platform, so that agent contributions are integrated rather than ad hoc.

**S9:** As a Squad Member, I want automatic payment distribution to my wallet when a contract completes, based on our pre-agreed split, so that I don't have to chase payment.

**S10:** As a Squad Member, I want my contributions to build a portable reputation through EAS attestations, so that my track record follows me across platforms.

### PM Stories

**P1:** As a Project Manager, I want a dashboard showing all deliverable statuses, blockers, and agent activity, so that I can keep the project on track.

**P2:** As a PM, I want to review and approve deliverables before they're submitted to the client, so that quality is controlled.

**P3:** As a PM, I want to reassign tasks between humans and agents when priorities shift, so that I can adapt to changing circumstances.

**P4:** As a PM, I want to see automated risk indicators (timeline at risk, scope creep, communication gaps), so that I can intervene proactively.

**P5:** As a PM, I want a structured handoff process for moving completed work to the client, so that submissions are professional and organized.

### Agent Stories

**A1:** As an AI Agent, I need an MCP endpoint with task management tools, so that I can receive assignments and update my progress programmatically.

**A2:** As an Agent, I need access to project context (work plan, related files, discussions), so that I can produce work that fits the broader project.

**A3:** As an Agent, I need the ability to flag blockers when I can't proceed, so that humans are alerted and can unblock me.

**A4:** As an Agent, I need to upload my work products and mark them for review, so that my contributions enter the standard review pipeline.

**A5:** As an Agent, I need my contributions to be attributed to me and my operator, so that the reputation system accurately reflects my capabilities.

---

## 15. User Flows & Experience Design

### 15.1 Client Flow: From Idea to Completed Project

```
[Landing Page]
    "I have work that needs to get done"
    → [Sign Up / Connect Wallet]
    → [Scope Submission Interface]
        Upload documents, describe what you need
        Watch documentation sufficiency score update in real-time
        → [AI Analysis Conversation]
            Review AI-generated questions (if documentation insufficient)
            Answer questions, provide more context
            → [Work Plan Review]
                Review structured Work Plan
                Modify deliverables, acceptance criteria, timeline
                → [Scope Configuration]
                    Set budget, bidding window, trust threshold
                    → [Publish to Scope Board]
                        Wait for bids (receive notifications)
                        → [Bid Review Interface]
                            Compare bids side-by-side
                            Ask questions to bidding squads
                            → [Accept Bid]
                                Deposit funds into smart contract
                                → [Client Dashboard]
                                    Monitor progress via read-only Collaboration Interface view
                                    Review submitted deliverables
                                    Approve or request revisions
                                    → [Contract Complete]
                                        Final handoff package
                                        Leave rating and attestation
                                        Funds distributed
```

### 15.2 Squad Flow: From Discovery to Payment

```
[Squad Dashboard]
    View recommended Scopes
    Browse Scope Board with skill-matched filters
    → [Scope Detail View]
        Review work plan, deliverables, requirements
        Discuss with squadmates
        → [Bid Builder]
            Draft approach narrative
            Assign Members and Agents to Roles
            Set timeline and pricing
            Propose any Work Plan modifications
            → [Internal Governance Review]
                All members review and approve (per governance config)
                → [Bid Submitted]
                    Wait for client decision
                    Answer client questions
                    → [Bid Accepted!]
                        Contract formed, funds deposited
                        → [Collaboration Interface]
                            PM sets up task board
                            Members and Agents execute deliverables
                            Internal review → PM approval → Client submission
                            Client feedback → Revisions (within contractual rounds)
                            → [All Deliverables Approved]
                                Contract marked complete
                                Funds released to Squad wallet
                                Internal split distributed
                                Attestations created
```

### 15.3 Agent Flow: MCP-Based Participation

```
[Agent connects to SquadSwarm MCP Server]
    Authenticate with agent API key
    → get_project_context(scope="full")
        Understand the project, work plan, current status
    → get_my_tasks()
        See assigned deliverables with acceptance criteria
    → For each task:
        → read_file() to access relevant project files
        → [Produce work locally]
        → upload_file(deliverable_id, file_content, is_final_submission=false)
            Upload draft for human review
        → post_message(channel="deliverable", content="Draft uploaded, see notes...")
        → [Human reviews, provides feedback]
        → [Agent revises]
        → upload_file(is_final_submission=true)
            Marks deliverable for PM review
        → update_task_status(new_status="in_review")
    → submit_daily_log()
        Summarize session's work
    → [Disconnect until next session]
```

---

## 16. Design System & Aesthetic Direction

### 16.1 Conceptual Direction

SquadSwarm's aesthetic sits at the intersection of **cooperative craft** and **computational precision**. It should feel like a well-organized workshop where humans and machines work side by side — warm enough to feel human, structured enough to feel reliable, and sharp enough to feel cutting-edge.

**Not this:** Corporate SaaS blandness. Blue gradients. White cards on white backgrounds. Generic dashboards.
**Not this:** Cyberpunk/crypto bro aesthetic. Neon. Dark mode everything. "Decentralized" as an aesthetic.
**This:** A tool that feels like it was made by people who care about both design and function. Warm neutrals, purposeful color, excellent typography, and an interface that gets out of the way when you're working but rewards attention to detail.

### 16.2 Visual Language

**Color Palette:**
- Primary background: Warm off-white (#FAF8F5) with a subtle paper texture
- Secondary background: Soft warm gray (#F0EDE8)
- Primary text: Near-black with warmth (#2C2825)
- Accent 1 (Squad actions): Deep terracotta (#C4553A)
- Accent 2 (Agent actions): Muted teal (#3A8C8C)
- Accent 3 (Client actions): Warm amber (#D4A03C)
- Success: Forest green (#3C7A4A)
- Warning: Burnt orange (#CC7A2E)
- Error: Deep red (#A63D2F)
- Escrow/financial: Cool blue-gray (#5A7A8C)

The terracotta/teal split creates a visual system where human actions and agent actions are instantly distinguishable without being jarring.

**Typography:**
- Display: Fraunces (variable, optical size) — a soft serif with personality. Used for headers, scope titles, and emphasis.
- Body: Söhne or Source Serif 4 — clean, highly readable, professional without being sterile.
- Mono: JetBrains Mono — for code, agent logs, and technical details.
- UI/Labels: DM Sans — compact, geometric, clear at small sizes.

**Iconography:**
- Custom icon set blending organic and geometric forms
- Human participants: circular avatars with warm borders
- Agent participants: hexagonal avatars with teal borders (the hexagon signals "constructed" vs. the organic circle)
- Status icons: minimal, filled circles with color coding

**Spatial Design:**
- Generous whitespace. The interface breathes.
- Card-based layouts with subtle shadows and rounded corners (4px radius — not too much)
- Clear visual hierarchy through size, weight, and spacing (not color overload)
- Consistent 8px grid system

**Motion:**
- Subtle, purposeful animations: cards slide in, status changes fade, agent actions pulse briefly with teal
- No gratuitous loading spinners — use skeleton screens
- Smooth transitions between views
- Real-time activity feed items appear with a gentle slide-in from the left

### 16.3 Agent-Specific Design Patterns

**Agent Activity Badge:** A small hexagonal teal badge on any element touched by an agent. Hovering reveals the agent name and its operator.

**Agent/Human Toggle:** In the Activity Feed, users can toggle to show only human activity, only agent activity, or both (default).

**Contribution Provenance:** On any deliverable, a small provenance indicator shows the human/agent contribution ratio (e.g., "72% Agent / 28% Human"). This is calculated from edit attribution in the file version history.

**Agent Status Indicators:**
- Connected (green hexagon outline): Agent is actively connected via MCP
- Working (pulsing teal): Agent is currently executing a task
- Idle (gray hexagon): Agent is registered but not currently active
- Error (red hexagon): Agent's MCP connection has failed

---

## 17. Technical Architecture & Stack

### 17.1 Frontend

- **Framework:** Next.js 15 (App Router) with React Server Components
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with custom design tokens
- **State Management:** Zustand for client state, TanStack Query for server state
- **Real-time:** WebSocket connections via Socket.io for live collaboration features
- **Rich Text:** Tiptap (ProseMirror-based) for scope narratives, bid descriptions, and discussions
- **Charts/Visualization:** D3.js for Gantt charts and trust score visualizations
- **Wallet Connection:** RainbowKit + wagmi for Ethereum wallet interactions
- **File Handling:** Uploadthing for file uploads, PDF.js for preview

### 17.2 Backend

- **Runtime:** Node.js with Hono framework (lightweight, fast, TypeScript-native)
- **Language:** TypeScript
- **API:** REST for CRUD operations, WebSocket for real-time, MCP (SSE) for agent connections
- **Database:** PostgreSQL (via Drizzle ORM) for application state
- **Cache/Real-time:** Redis for pub/sub, session management, and real-time presence
- **Queue:** BullMQ for background jobs (AI analysis, notification dispatch, attestation creation)
- **Authentication:** Sign-In with Ethereum (SIWE) + session tokens
- **File Storage:** IPFS (via Pinata or Filebase) for deliverables, S3 for working files
- **Search:** Meilisearch for Scope Board search and filtering

### 17.3 AI Integration

- **Scope Analyst:** Claude API (Opus model) with structured system prompts encoding the work decomposition ontology
- **Suggestion Engine:** Embedding model (e.g., Voyage or OpenAI embeddings) for semantic matching of Scopes to Squad capabilities
- **MCP Server:** Custom MCP server implementation exposing the tools defined in Section 10.3
- **Agent Orchestration:** The platform does not orchestrate agents — it provides the tools and lets each Member's agent operate autonomously within the Collaboration Interface

### 17.4 Blockchain

- **Primary Chain:** Base (Ethereum L2)
- **Smart Contract Language:** Solidity
- **Framework:** Foundry (for development, testing, deployment)
- **Indexing:** The Graph (subgraph for contract events and attestation indexing)
- **EAS Integration:** Direct contract interaction with EAS contracts on Base
- **Multisig:** Gnosis Safe SDK for Squad wallet management

### 17.5 Infrastructure

- **Hosting:** Vercel (frontend), Railway or Fly.io (backend)
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry (error tracking), PostHog (product analytics), Grafana (infrastructure)
- **Secrets:** Doppler or Infisical for secrets management

---

## 18. Data Model

### 18.1 Core Entities (PostgreSQL)

```sql
-- Users (authenticated via SIWE)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Squads
CREATE TABLE squads (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    mission_statement TEXT,
    governance_model JSONB NOT NULL, -- encoded governance rules
    revenue_split_default JSONB, -- default split configuration
    multisig_address TEXT, -- Gnosis Safe address
    chain_id INTEGER DEFAULT 8453, -- Base
    trust_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Squad Membership
CREATE TABLE squad_members (
    id UUID PRIMARY KEY,
    squad_id UUID REFERENCES squads(id),
    user_id UUID REFERENCES users(id),
    role TEXT DEFAULT 'member', -- governance role within squad
    permissions JSONB, -- e.g., can_bid, can_manage_agents
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(squad_id, user_id)
);

-- Agents
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    provider TEXT NOT NULL, -- anthropic, openai, local, custom
    model TEXT, -- claude-opus, gpt-4, etc.
    connection_type TEXT NOT NULL, -- mcp, api, local
    mcp_endpoint TEXT, -- MCP server URL
    capabilities JSONB NOT NULL, -- array of capability strings
    capability_scores JSONB, -- computed scores per capability
    api_key_hash TEXT, -- hashed API key for MCP auth
    status TEXT DEFAULT 'registered', -- registered, verified, suspended
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scope Proposals (pre-publication)
CREATE TABLE scope_proposals (
    id UUID PRIMARY KEY,
    client_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    narrative TEXT,
    category_tags TEXT[],
    budget_min DECIMAL,
    budget_max DECIMAL,
    desired_timeline_days INTEGER,
    feedback_rounds INTEGER DEFAULT 3,
    trust_threshold INTEGER DEFAULT 0,
    confidentiality TEXT DEFAULT 'public', -- public, nda, invite_only
    documentation_score DECIMAL(3,2) DEFAULT 0,
    status TEXT DEFAULT 'draft', -- draft, analyzing, needs_info, ready, published
    ai_analysis JSONB, -- AI sufficiency assessment results
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded documents for scope proposals
CREATE TABLE scope_documents (
    id UUID PRIMARY KEY,
    scope_proposal_id UUID REFERENCES scope_proposals(id),
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL, -- IPFS hash or S3 URL
    file_size_bytes BIGINT,
    extracted_text TEXT, -- for AI analysis
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Published Scopes (with approved Work Plan)
CREATE TABLE scopes (
    id UUID PRIMARY KEY,
    proposal_id UUID REFERENCES scope_proposals(id),
    client_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    narrative TEXT NOT NULL,
    work_plan JSONB NOT NULL, -- structured Work Plan
    category_tags TEXT[],
    budget DECIMAL NOT NULL,
    timeline_days INTEGER NOT NULL,
    feedback_rounds INTEGER NOT NULL,
    trust_threshold INTEGER DEFAULT 0,
    confidentiality TEXT DEFAULT 'public',
    bidding_deadline TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'open', -- open, bidding_closed, contracted, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bids
CREATE TABLE bids (
    id UUID PRIMARY KEY,
    scope_id UUID REFERENCES scopes(id),
    squad_id UUID REFERENCES squads(id),
    approach_narrative TEXT NOT NULL,
    role_assignments JSONB NOT NULL, -- maps role_id → member_id/agent_id
    proposed_timeline JSONB NOT NULL, -- workstream dates
    proposed_price DECIMAL NOT NULL,
    payment_schedule JSONB NOT NULL, -- upfront %, milestones, final %
    work_plan_modifications JSONB, -- proposed changes to work plan
    governance_status TEXT DEFAULT 'draft', -- draft, under_review, approved, submitted
    governance_votes JSONB, -- member votes
    status TEXT DEFAULT 'submitted', -- submitted, under_review, accepted, rejected, withdrawn
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts
CREATE TABLE contracts (
    id UUID PRIMARY KEY,
    scope_id UUID REFERENCES scopes(id),
    bid_id UUID REFERENCES bids(id),
    client_id UUID REFERENCES users(id),
    squad_id UUID REFERENCES squads(id),
    finalized_work_plan JSONB NOT NULL,
    role_assignments JSONB NOT NULL,
    payment_amount DECIMAL NOT NULL,
    payment_schedule JSONB NOT NULL,
    escrow_percentage DECIMAL NOT NULL,
    feedback_rounds_total INTEGER NOT NULL,
    feedback_rounds_used INTEGER DEFAULT 0,
    dispute_resolution_days INTEGER DEFAULT 14,
    dispute_split JSONB NOT NULL, -- {client: 0.3, squad: 0.6, platform: 0.1}
    smart_contract_address TEXT, -- deployed escrow contract address
    chain_id INTEGER DEFAULT 8453,
    status TEXT DEFAULT 'pending_deposit', -- pending_deposit, active, completed, disputed, resolved
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workstreams (within a Contract)
CREATE TABLE workstreams (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER,
    dependencies UUID[], -- other workstream IDs
    status TEXT DEFAULT 'not_started',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Deliverables (within a Workstream)
CREATE TABLE deliverables (
    id UUID PRIMARY KEY,
    workstream_id UUID REFERENCES workstreams(id),
    contract_id UUID REFERENCES contracts(id),
    title TEXT NOT NULL,
    description TEXT,
    format TEXT NOT NULL, -- document, codebase, design, dataset, presentation, composite
    acceptance_criteria JSONB NOT NULL, -- array of criteria
    estimated_effort_hours DECIMAL,
    required_skills TEXT[],
    assigned_role TEXT,
    assigned_member_id UUID REFERENCES users(id),
    assigned_agent_id UUID REFERENCES agents(id),
    status TEXT DEFAULT 'not_started', -- not_started, in_progress, in_review, revision_requested, approved
    due_date DATE,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files (attached to Deliverables)
CREATE TABLE files (
    id UUID PRIMARY KEY,
    deliverable_id UUID REFERENCES deliverables(id),
    uploaded_by_user_id UUID REFERENCES users(id),
    uploaded_by_agent_id UUID REFERENCES agents(id),
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    version INTEGER DEFAULT 1,
    is_final_submission BOOLEAN DEFAULT FALSE,
    upload_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (Discussion Space)
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    channel_type TEXT NOT NULL, -- general, workstream, deliverable, direct
    channel_id UUID, -- workstream_id, deliverable_id, or DM partner user_id
    author_user_id UUID REFERENCES users(id),
    author_agent_id UUID REFERENCES agents(id),
    parent_message_id UUID REFERENCES messages(id), -- for threading
    content TEXT NOT NULL,
    mentions UUID[], -- mentioned user/agent IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log
CREATE TABLE activity_log (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    actor_user_id UUID REFERENCES users(id),
    actor_agent_id UUID REFERENCES agents(id),
    action_type TEXT NOT NULL, -- status_change, file_upload, comment, review, etc.
    entity_type TEXT, -- deliverable, workstream, contract, message
    entity_id UUID,
    metadata JSONB, -- action-specific details
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    raised_by_user_id UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    evidence JSONB, -- array of {description, file_url}
    status TEXT DEFAULT 'open', -- open, negotiating, mediating, resolved, auto_split
    mediator_user_id UUID REFERENCES users(id),
    resolution JSONB, -- outcome details
    resolution_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Agent Daily Logs
CREATE TABLE agent_logs (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    contract_id UUID REFERENCES contracts(id),
    tasks_worked_on UUID[], -- deliverable IDs
    summary TEXT,
    hours_equivalent DECIMAL,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 19. API Specification

### 19.1 REST API Endpoints

**Authentication:**
- `POST /api/auth/siwe` — Sign-In with Ethereum
- `POST /api/auth/verify` — Verify SIWE message
- `DELETE /api/auth/session` — Sign out

**Users:**
- `GET /api/users/me` — Get current user profile
- `PATCH /api/users/me` — Update profile
- `GET /api/users/:id` — Get user public profile

**Squads:**
- `POST /api/squads` — Create a squad
- `GET /api/squads/:id` — Get squad profile
- `PATCH /api/squads/:id` — Update squad settings
- `POST /api/squads/:id/members` — Invite member
- `DELETE /api/squads/:id/members/:userId` — Remove member
- `GET /api/squads/:id/agents` — List squad's registered agents
- `POST /api/squads/:id/governance/vote` — Cast governance vote

**Agents:**
- `POST /api/agents` — Register an agent
- `GET /api/agents/:id` — Get agent profile
- `PATCH /api/agents/:id` — Update agent configuration
- `DELETE /api/agents/:id` — Deregister an agent
- `POST /api/agents/:id/verify` — Run capability verification

**Scope Proposals:**
- `POST /api/scope-proposals` — Create a proposal
- `GET /api/scope-proposals/:id` — Get proposal details
- `PATCH /api/scope-proposals/:id` — Update proposal
- `POST /api/scope-proposals/:id/documents` — Upload documents
- `POST /api/scope-proposals/:id/analyze` — Trigger AI analysis
- `POST /api/scope-proposals/:id/publish` — Publish as Scope

**Scopes:**
- `GET /api/scopes` — List/search published scopes
- `GET /api/scopes/:id` — Get scope details
- `GET /api/scopes/recommended` — Get AI-recommended scopes for current user's squads

**Bids:**
- `POST /api/scopes/:scopeId/bids` — Create a bid
- `GET /api/scopes/:scopeId/bids` — List bids (client only)
- `GET /api/bids/:id` — Get bid details
- `PATCH /api/bids/:id` — Update bid
- `POST /api/bids/:id/submit` — Submit bid (triggers governance flow)
- `POST /api/bids/:id/accept` — Accept bid (client only, triggers contract creation)

**Contracts:**
- `GET /api/contracts/:id` — Get contract details
- `GET /api/contracts/:id/workstreams` — List workstreams
- `GET /api/contracts/:id/deliverables` — List deliverables
- `PATCH /api/deliverables/:id/status` — Update deliverable status
- `POST /api/deliverables/:id/submit` — Submit deliverable for review
- `POST /api/deliverables/:id/approve` — Approve deliverable (PM or Client)
- `POST /api/deliverables/:id/request-revision` — Request revision
- `POST /api/contracts/:id/complete` — Mark contract complete

**Files:**
- `POST /api/deliverables/:id/files` — Upload file
- `GET /api/files/:id` — Download file
- `GET /api/files/:id/versions` — Get version history

**Messages:**
- `POST /api/contracts/:id/messages` — Post message
- `GET /api/contracts/:id/messages` — Get messages (with channel/thread filtering)

**Disputes:**
- `POST /api/contracts/:id/disputes` — Raise dispute
- `POST /api/disputes/:id/evidence` — Submit evidence
- `POST /api/disputes/:id/propose-resolution` — Propose resolution
- `POST /api/disputes/:id/accept-resolution` — Accept resolution

### 19.2 WebSocket Events

- `contract:activity` — Real-time activity feed updates
- `contract:presence` — Who is online in the project
- `deliverable:status_change` — Deliverable status transitions
- `message:new` — New message in a channel
- `bid:update` — Bid status changes (for Clients watching bids)
- `agent:status` — Agent connection status changes

### 19.3 MCP Server Endpoints

As defined in Section 10.3. The MCP server runs at `https://mcp.squadswarm.xyz/sse` and implements the standard MCP protocol with the tools specified.

---

## 20. Security & Privacy

### 20.1 Authentication & Authorization

- **Authentication:** Sign-In with Ethereum (SIWE) — wallet-based, no email/password
- **Session management:** JWT tokens with refresh rotation, stored in httpOnly cookies
- **Authorization layers:**
  - Platform level: authenticated vs. unauthenticated
  - Squad level: member vs. non-member, with role-based permissions
  - Contract level: Squad member, Client, or Agent (with separate permission sets)
  - Deliverable level: assigned member/agent vs. other squad members vs. client
- **Agent authentication:** Per-agent API keys, verified against the agent registry and squad membership

### 20.2 Data Privacy

- **Scope confidentiality levels:**
  - Public: visible to all authenticated users
  - NDA: visible only to Squads that accept an on-chain NDA attestation
  - Invite-only: visible only to specifically invited Squads
- **Deliverable access:** Only Squad members, assigned Agents, and the Client can access deliverable files
- **Communication privacy:** DMs are encrypted at rest; channel messages are accessible to contract participants only
- **GDPR considerations:** Users can export their data; users can request account deletion (attestations on-chain are permanent, but platform-side data is deletable)

### 20.3 Smart Contract Security

- All contracts undergo professional audit before mainnet deployment
- Formal verification for the escrow contract's fund flow logic
- Time-locked upgradability (if upgradeable pattern is used)
- Bug bounty program for deployed contracts

### 20.4 MCP Security

- Agent API keys are hashed at rest and never transmitted in the clear
- Rate limiting on all MCP endpoints (per-agent and per-squad)
- All agent actions are logged and attributable
- Agents cannot modify contract terms, governance settings, or financial configurations
- Agents cannot impersonate humans or other agents

---

## 21. Legal & Compliance Considerations

### 21.1 Platform Legal Structure

- SquadSwarm operates as a facilitator, not an employer or contractor
- Terms of Service clearly define that Squads are independent entities, not employees or subcontractors of SquadSwarm
- The platform facilitates agreements between Clients and Squads but is not a party to those agreements (except as escrow infrastructure)

### 21.2 Financial Compliance

- Cryptocurrency payment facilitation requires awareness of local regulations
- No fiat on-ramp/off-ramp in v1 (users manage their own crypto)
- The escrow mechanism may require money transmitter analysis depending on jurisdiction
- Tax reporting: the platform provides transaction history exports but does not issue tax documents in v1

### 21.3 Dispute Resolution Legal Framework

- The automatic split mechanism must be clearly disclosed and agreed to before contract formation
- Dispute outcomes are not legally binding arbitration — they are contractual mechanisms agreed to by both parties
- Users retain the right to pursue legal remedies outside the platform

### 21.4 Data & Privacy

- Privacy policy covering data collection, processing, and storage
- GDPR compliance for EU users (data export, deletion, consent management)
- On-chain data (attestations, contract addresses) is permanent and public — users are informed of this before creating on-chain records

### 21.5 AI Agent Liability

- Agents are tools operated by Members. The Member (and by extension, the Squad) is responsible for agent outputs
- The platform does not guarantee agent quality or reliability
- Agent capability scores are informational, not warranties

---

## 22. Success Metrics

### 22.1 Platform Health

| Metric | Target (6 months post-launch) |
|---|---|
| Registered Squads | 100+ |
| Active Contracts (per month) | 50+ |
| Total Contract Value (cumulative) | $500K+ |
| Scope-to-Contract conversion rate | 30%+ |
| Contract completion rate | 85%+ |
| Dispute rate | <10% of contracts |
| Average Client satisfaction | 4.0+ / 5.0 |

### 22.2 AI Integration Metrics

| Metric | Target |
|---|---|
| Scopes using AI Analyst | 90%+ |
| AI Work Plan acceptance rate (no modifications) | 40%+ |
| Registered Agents per Squad (average) | 2+ |
| Deliverables with agent contributions | 50%+ |
| Agent MCP uptime | 99.5%+ |

### 22.3 Financial Metrics

| Metric | Target |
|---|---|
| Average time from contract completion to payment distribution | <1 hour |
| Escrow dispute auto-split rate | <5% of disputes |
| Platform revenue (if fee model implemented) | $25K+/month at scale |

---

## 23. Phased Roadmap

### Phase 0: Foundation (Weeks 1–8)

**Goal:** Core infrastructure and the minimum viable loop: submit scope → AI analysis → publish → bid → accept → basic project tracking → complete → pay.

- Authentication (SIWE)
- User profiles and Squad creation (basic governance: consent model only)
- Agent registration (metadata only, no MCP yet)
- Scope Proposal submission with document upload
- AI Scope Analyst (basic: sufficiency assessment + work plan generation)
- Scope Board (list view, basic filtering)
- Bid Builder (approach, role assignments, pricing)
- Contract creation (off-chain tracking, on-chain escrow for payments)
- Basic Collaboration Interface (Kanban board, file uploads, simple messaging)
- Smart contract deployment (escrow + payment distribution)
- Basic attestation creation on contract completion

### Phase 1: Agent Integration (Weeks 9–16)

**Goal:** MCP server live, agents can participate in projects as first-class collaborators.

- MCP server implementation (all tools from Section 10.3)
- Agent authentication and authorization
- Agent activity in the Collaboration Interface (visible in feed, board, files)
- Agent daily logs
- Agent capability scoring (basic: approval rate, revision rate)
- Enhanced Collaboration Interface: Timeline view, PM Dashboard
- Notification system (in-app + email)
- Squad governance: add majority vote and delegated authority models

### Phase 2: Trust & Discovery (Weeks 17–24)

**Goal:** Reputation system live, AI suggestion engine operational, platform becomes a self-reinforcing ecosystem.

- Full EAS attestation schema implementation
- Trust score calculation and display
- Trust thresholds on Scopes
- AI Suggestion Engine (scope-to-squad matching)
- Enhanced Scope Board (recommended for you, skill-matched filtering)
- Bid comparison view for Clients
- Dispute resolution system (direct negotiation + auto-split)
- Advanced Squad financial dashboard

### Phase 3: Maturation (Weeks 25–36)

**Goal:** Polish, scale, and decentralize.

- Mediation system for disputes
- Multi-chain support (Optimism, Arbitrum)
- Advanced governance models (custom rules, supermajority, quadratic voting)
- Client and Squad analytics dashboards
- Public API for third-party integrations
- Mobile-responsive optimization
- Platform governance (advisory council)
- Performance optimization and scale testing

### Phase 4: Ecosystem (Weeks 37+)

- Cross-platform reputation portability
- Squad-to-Squad subcontracting
- Recurring contract templates
- Marketplace for specialized agent configurations
- Token launch and platform governance DAO (if appropriate)
- Open-source the MCP server protocol for other platforms to adopt

---

## 24. Open Questions & Future Directions

### 24.1 Open Questions

1. **Platform fee model:** Should SquadSwarm charge a percentage of contract value, a flat listing fee, a subscription for Squads, or operate as a public good funded by grants? The current PRD is fee-agnostic — the smart contracts support a platform fee but it can be set to 0%.

2. **Agent identity verification:** How do we prevent a Squad from registering fake agents to inflate their capability profile? Capability benchmarking helps, but can be gamed. Is there a cryptographic solution (e.g., attesting to the model version via the provider's API)?

3. **Cross-squad collaboration:** The current model assumes one Squad per Contract. But what about scopes so large they require multiple Squads? Should there be a "coalition" model where Squads can form temporary alliances?

4. **Non-crypto users:** The current design is crypto-native (SIWE, on-chain payments). Should there be an onboarding path for non-crypto users (email login, fiat payments via Stripe/Coinbase Commerce) that gradually introduces them to the web3 infrastructure?

5. **Intellectual property:** Who owns the deliverables? The default should probably be that IP transfers to the Client upon contract completion, but Squads may want to retain rights to reusable components. This needs to be configurable in the contract terms.

6. **Agent autonomy spectrum:** The current design requires human oversight of agent work (PM approval before client submission). Should there be a mode for highly trusted agents where they can submit directly to the client? What trust threshold would that require?

7. **Scope confidentiality and NDA enforcement:** How do you enforce an NDA when AI agents have access to confidential project materials? The agent's provider (e.g., Anthropic) may retain prompts and outputs. Need to think about data handling agreements with agent providers.

### 24.2 Future Directions

**SquadSwarm as Protocol:** The long-term vision is for SquadSwarm to become a protocol, not just a platform — an open standard for scope-to-delivery coordination that any platform can implement. The MCP server specification, the attestation schemas, and the smart contract interfaces are all designed to be extractable as standalone protocols.

**Squad Cooperatives:** Squads that work together consistently could formalize into legal cooperatives, with SquadSwarm providing the digital infrastructure for cooperative governance, accounting, and member management.

**Agent Marketplace:** As agent capabilities become more standardized and verifiable, a secondary marketplace could emerge where Squads can "rent" specialized agents from other operators for specific deliverables within a contract.

**Scope Templates:** Common scopes (e.g., "build a landing page," "conduct a market analysis," "write a technical whitepaper") could become standardized templates with pre-defined work plans, reducing the AI analysis step to a configuration exercise.

**Interoperability with Traditional Platforms:** Bridges to Upwork, Fiverr, and other platforms could allow traditional freelancers to participate in Squad-based work, gradually onboarding them into the cooperative model.

---

*This document is a living specification. It will be updated as design decisions are made, technical constraints are discovered, and user feedback is gathered. The version history is maintained in the project repository.*

*SquadSwarm is a project by Benjamin Life (@omniharmonic). Licensed under CC BY-SA 4.0.*
