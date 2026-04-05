/**
 * SquadSwarm Collaborative Flow Test Script
 *
 * Simulates the full collaborative bidding and contract workflow using direct DB operations.
 * Run with: npx tsx apps/web/scripts/test-collaborative-flow.ts
 *
 * Requires DATABASE_URL environment variable to be set.
 */

import { eq, and } from 'drizzle-orm';
import {
  db,
  users,
  squads,
  squadMembers,
  scopes,
  bids,
  bidAssignments,
  bidVotes,
  contracts,
  workstreams,
  deliverables,
  agents,
  agentActionQueue,
} from '@squadswarm/db';

// ── Test Utilities ──

let passed = 0;
let failed = 0;
const cleanup: Array<() => Promise<void>> = [];

function log(step: string, status: 'PASS' | 'FAIL', detail?: string) {
  const icon = status === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  [${icon}] ${step}${detail ? ` — ${detail}` : ''}`);
  if (status === 'PASS') passed++;
  else failed++;
}

function assert(condition: boolean, step: string, detail?: string) {
  if (condition) {
    log(step, 'PASS', detail);
  } else {
    log(step, 'FAIL', detail);
  }
}

// ── Cleanup helper ──

async function cleanupTestData(ids: {
  userIds: string[];
  squadId?: string;
  scopeId?: string;
  bidId?: string;
  contractId?: string;
  agentId?: string;
}) {
  console.log('\n  Cleaning up test data...');

  try {
    // Delete in dependency order
    if (ids.contractId) {
      await db.delete(agentActionQueue).where(eq(agentActionQueue.contractId, ids.contractId));
      await db.delete(deliverables).where(eq(deliverables.contractId, ids.contractId));
      await db.delete(workstreams).where(eq(workstreams.contractId, ids.contractId));
      await db.delete(contracts).where(eq(contracts.id, ids.contractId));
    }
    if (ids.bidId) {
      await db.delete(bidVotes).where(eq(bidVotes.bidId, ids.bidId));
      await db.delete(bidAssignments).where(eq(bidAssignments.bidId, ids.bidId));
      await db.delete(bids).where(eq(bids.id, ids.bidId));
    }
    if (ids.agentId) {
      await db.delete(agents).where(eq(agents.id, ids.agentId));
    }
    if (ids.scopeId) {
      await db.delete(scopes).where(eq(scopes.id, ids.scopeId));
    }
    if (ids.squadId) {
      await db.delete(squadMembers).where(eq(squadMembers.squadId, ids.squadId));
      await db.delete(squads).where(eq(squads.id, ids.squadId));
    }
    for (const uid of ids.userIds) {
      await db.delete(users).where(eq(users.id, uid));
    }
    console.log('  Cleanup complete.\n');
  } catch (err) {
    console.error('  Cleanup error (non-fatal):', err);
  }
}

// ── Main Test Flow ──

async function main() {
  console.log('\n========================================');
  console.log(' SquadSwarm Collaborative Flow Test');
  console.log('========================================\n');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    console.error('Set it to your Neon database connection string.');
    process.exit(1);
  }

  const testIds: {
    userIds: string[];
    squadId?: string;
    scopeId?: string;
    bidId?: string;
    contractId?: string;
    agentId?: string;
  } = { userIds: [] };

  try {
    // ── Step 1: Create test users ──
    console.log('Step 1: Create test users');

    const [alice] = await db.insert(users).values({
      email: `alice-test-${Date.now()}@squadswarm.test`,
      displayName: 'Alice (Client)',
    }).returning();
    testIds.userIds.push(alice!.id);
    assert(!!alice, 'Create Alice (client)', alice?.email ?? undefined);

    const [bob] = await db.insert(users).values({
      email: `bob-test-${Date.now()}@squadswarm.test`,
      displayName: 'Bob (Squad Lead)',
    }).returning();
    testIds.userIds.push(bob!.id);
    assert(!!bob, 'Create Bob (squad lead)', bob?.email);

    const [carol] = await db.insert(users).values({
      email: `carol-test-${Date.now()}@squadswarm.test`,
      displayName: 'Carol (Member)',
    }).returning();
    testIds.userIds.push(carol!.id);
    assert(!!carol, 'Create Carol (member)', carol?.email);

    // ── Step 2: Create squad with consent governance ──
    console.log('\nStep 2: Create squad "TestSquad" with consent governance');

    const slug = `testsquad-${Date.now()}`;
    const [squad] = await db.insert(squads).values({
      name: 'TestSquad',
      slug,
      bio: 'A test squad for collaborative flow testing',
      governanceModel: { type: 'consent', quorum: 'majority' },
      paymentMode: 'fiat',
    }).returning();
    testIds.squadId = squad!.id;
    assert(!!squad, 'Create TestSquad', `id=${squad?.id}`);

    // Add members
    await db.insert(squadMembers).values([
      { squadId: squad!.id, userId: bob!.id, role: 'lead' },
      { squadId: squad!.id, userId: carol!.id, role: 'member' },
    ]);
    const members = await db.select().from(squadMembers).where(eq(squadMembers.squadId, squad!.id));
    assert(members.length === 2, 'Add Bob (lead) and Carol (member) to squad', `${members.length} members`);

    // ── Step 3: Create a scope with work plan ──
    console.log('\nStep 3: Create scope with work plan (3 deliverables)');

    const workPlan = {
      workstreams: [
        {
          title: 'Frontend Development',
          description: 'Build the user interface',
          orderIndex: 0,
          deliverables: [
            {
              title: 'Landing Page',
              description: 'Responsive landing page with hero section',
              format: 'codebase',
              acceptanceCriteria: [
                { text: 'Responsive on mobile, tablet, desktop' },
                { text: 'Lighthouse score > 90' },
              ],
              estimatedEffortHours: 16,
            },
            {
              title: 'Dashboard UI',
              description: 'Main dashboard with data visualizations',
              format: 'codebase',
              acceptanceCriteria: [
                { text: 'Real-time data updates' },
                { text: 'Accessible (WCAG 2.1 AA)' },
              ],
              estimatedEffortHours: 24,
            },
          ],
        },
        {
          title: 'API Development',
          description: 'Build the backend services',
          orderIndex: 1,
          deliverables: [
            {
              title: 'REST API',
              description: 'RESTful API with authentication',
              format: 'codebase',
              acceptanceCriteria: [
                { text: 'All endpoints documented in OpenAPI' },
                { text: '95% test coverage' },
              ],
              estimatedEffortHours: 32,
            },
          ],
        },
      ],
    };

    const [scope] = await db.insert(scopes).values({
      clientId: alice!.id,
      title: 'Test Project — Full-Stack Web App',
      narrative: 'Build a full-stack web application with modern UI and robust API.',
      categoryTags: ['web', 'fullstack'],
      budgetMin: '5000.00',
      budgetMax: '10000.00',
      timelineDays: 30,
      feedbackRounds: 3,
      workPlan,
      status: 'draft',
    }).returning();
    testIds.scopeId = scope!.id;
    assert(!!scope, 'Create scope with work plan', `id=${scope?.id}`);

    // ── Step 4: Publish the scope ──
    console.log('\nStep 4: Publish the scope');

    const [publishedScope] = await db
      .update(scopes)
      .set({ status: 'open', updatedAt: new Date() })
      .where(eq(scopes.id, scope!.id))
      .returning();
    assert(publishedScope?.status === 'open', 'Scope published', `status=${publishedScope?.status}`);

    // ── Step 5: Bob creates a bid with assignments ──
    console.log('\nStep 5: Bob creates a bid with assignments');

    const [bid] = await db.insert(bids).values({
      scopeId: scope!.id,
      squadId: squad!.id,
      createdById: bob!.id,
      approach: 'We will use Next.js 15 with a modern stack. Bob leads frontend, Carol handles API.',
      proposedPrice: '7500.00',
      proposedTimeline: { weeks: 4, milestones: ['Week 1: Setup', 'Week 2: Frontend', 'Week 3: API', 'Week 4: Integration'] },
      paymentSchedule: { upfrontPercentage: 25, finalPercentage: 75 },
      workPlanModifications: workPlan,
      treasuryShareBps: 1000,
      status: 'draft',
    }).returning();
    testIds.bidId = bid!.id;
    assert(!!bid, 'Create bid', `id=${bid?.id}, price=$${bid?.proposedPrice}`);

    // Create assignments: Bob 40%, Carol 30%, Treasury 10%, Reserve 20%
    const assignmentData = [
      { bidId: bid!.id, userId: bob!.id, role: 'lead', label: 'Bob (Lead)', shareBps: 4000 },
      { bidId: bid!.id, userId: carol!.id, role: 'member', label: 'Carol (Member)', shareBps: 3000 },
      { bidId: bid!.id, userId: null, role: 'treasury', label: 'Squad Treasury', shareBps: 1000 },
      { bidId: bid!.id, userId: null, role: 'treasury', label: 'Reserve Fund', shareBps: 2000 },
    ];

    for (const a of assignmentData) {
      await db.insert(bidAssignments).values(a);
    }
    const insertedAssignments = await db.select().from(bidAssignments).where(eq(bidAssignments.bidId, bid!.id));
    const totalBps = insertedAssignments.reduce((sum, a) => sum + a.shareBps, 0);
    assert(insertedAssignments.length === 4, 'Create 4 bid assignments', `total=${totalBps} bps`);
    assert(totalBps === 10000, 'Assignments total 100%', `${totalBps} bps`);

    // ── Step 6: Submit bid for governance review ──
    console.log('\nStep 6: Submit bid for governance review');

    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 48);

    const [reviewBid] = await db
      .update(bids)
      .set({
        governanceStatus: 'in_review',
        governanceDeadline: deadline,
        submittedById: bob!.id,
        updatedAt: new Date(),
      })
      .where(eq(bids.id, bid!.id))
      .returning();
    assert(reviewBid?.governanceStatus === 'in_review', 'Bid submitted for review', `deadline=${deadline.toISOString()}`);

    // ── Step 7: Bob and Carol vote approve → bid ratified ──
    console.log('\nStep 7: Governance voting');

    // Bob votes approve
    const [bobVote] = await db.insert(bidVotes).values({
      bidId: bid!.id,
      userId: bob!.id,
      vote: 'approve',
      reason: 'Looks good, fair split.',
    }).returning();
    assert(!!bobVote, 'Bob votes approve');

    // Carol votes approve
    const [carolVote] = await db.insert(bidVotes).values({
      bidId: bid!.id,
      userId: carol!.id,
      vote: 'approve',
      reason: 'Agreed, timeline is reasonable.',
    }).returning();
    assert(!!carolVote, 'Carol votes approve');

    // Check ratification (majority = ceil(2/2) = 1, and we have 2 approvals)
    const allVotes = await db.select().from(bidVotes).where(eq(bidVotes.bidId, bid!.id));
    const approveCount = allVotes.filter(v => v.vote === 'approve').length;
    const majority = Math.ceil(members.length / 2);
    const shouldRatify = approveCount >= majority;

    assert(shouldRatify, 'Majority reached for ratification', `${approveCount} approvals >= ${majority} majority`);

    if (shouldRatify) {
      await db
        .update(bids)
        .set({
          governanceStatus: 'ratified',
          ratifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bids.id, bid!.id));
    }

    const [ratifiedBid] = await db.select().from(bids).where(eq(bids.id, bid!.id)).limit(1);
    assert(ratifiedBid?.governanceStatus === 'ratified', 'Bid ratified', `ratifiedAt=${ratifiedBid?.ratifiedAt}`);

    // ── Step 8: Submit bid to client ──
    console.log('\nStep 8: Submit bid to client');

    const [submittedBid] = await db
      .update(bids)
      .set({ status: 'submitted', submittedById: bob!.id, updatedAt: new Date() })
      .where(eq(bids.id, bid!.id))
      .returning();
    assert(submittedBid?.status === 'submitted', 'Bid submitted to client', `status=${submittedBid?.status}`);

    // ── Step 9: Alice accepts bid → contract created ──
    console.log('\nStep 9: Alice accepts bid → contract created');

    const finalizedWorkPlan = (submittedBid?.workPlanModifications || workPlan) as typeof workPlan;

    // Create contract
    const [contract] = await db.insert(contracts).values({
      scopeId: scope!.id,
      bidId: bid!.id,
      clientId: alice!.id,
      squadId: squad!.id,
      title: scope!.title,
      finalizedWorkPlan,
      roleAssignments: assignmentData,
      paymentSchedule: { upfrontPercentage: 25, finalPercentage: 75 },
      totalAmount: submittedBid!.proposedPrice || '7500.00',
      feedbackRoundsTotal: 3,
      deliverableWeights: {},
    }).returning();
    testIds.contractId = contract!.id;
    assert(!!contract, 'Contract created', `id=${contract?.id}`);

    // Create workstreams and deliverables from work plan
    const deliverableWeights: Record<string, number> = {};
    let totalEffort = 0;

    for (const ws of finalizedWorkPlan.workstreams || []) {
      for (const del of ws.deliverables || []) {
        totalEffort += del.estimatedEffortHours || 0;
      }
    }

    for (let i = 0; i < (finalizedWorkPlan.workstreams || []).length; i++) {
      const ws = finalizedWorkPlan.workstreams![i]!;
      const [wsRow] = await db.insert(workstreams).values({
        contractId: contract!.id,
        title: ws.title,
        description: ws.description,
        orderIndex: ws.orderIndex ?? i,
      }).returning();

      for (const del of ws.deliverables || []) {
        const [delRow] = await db.insert(deliverables).values({
          contractId: contract!.id,
          workstreamId: wsRow!.id,
          title: del.title,
          description: del.description,
          format: del.format,
          acceptanceCriteria: del.acceptanceCriteria,
          estimatedEffortHours: del.estimatedEffortHours,
        }).returning();

        // Calculate weight based on effort proportion
        if (delRow && totalEffort > 0) {
          deliverableWeights[delRow.id] = Math.round(((del.estimatedEffortHours || 0) / totalEffort) * 10000);
        }
      }
    }

    // Update contract with deliverable weights
    await db
      .update(contracts)
      .set({ deliverableWeights, updatedAt: new Date() })
      .where(eq(contracts.id, contract!.id));

    // Update bid and scope status
    await db.update(bids).set({ status: 'accepted', updatedAt: new Date() }).where(eq(bids.id, bid!.id));
    await db.update(scopes).set({ status: 'contracted', updatedAt: new Date() }).where(eq(scopes.id, scope!.id));

    // ── Step 10: Verify contract structure ──
    console.log('\nStep 10: Verify contract structure');

    const wsRows = await db.select().from(workstreams).where(eq(workstreams.contractId, contract!.id));
    assert(wsRows.length === 2, 'Contract has 2 workstreams', `found ${wsRows.length}`);

    const delRows = await db.select().from(deliverables).where(eq(deliverables.contractId, contract!.id));
    assert(delRows.length === 3, 'Contract has 3 deliverables', `found ${delRows.length}`);

    const [updatedContract] = await db.select().from(contracts).where(eq(contracts.id, contract!.id)).limit(1);
    const weights = updatedContract?.deliverableWeights as Record<string, number> | null;
    const weightValues = weights ? Object.values(weights) : [];
    const weightTotal = weightValues.reduce((s, w) => s + w, 0);
    assert(weightValues.length === 3, 'Deliverable weights assigned', `${weightValues.length} weights`);
    assert(weightTotal === 10000 || Math.abs(weightTotal - 10000) < 10, 'Weights sum to ~100%', `total=${weightTotal} bps`);

    // ── Step 11: Create and assign an agent ──
    console.log('\nStep 11: Create agent, assign to deliverable');

    const [agent] = await db.insert(agents).values({
      ownerId: bob!.id,
      name: 'TestBot-001',
      description: 'A test AI agent for the collaborative flow',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      connectionType: 'mcp',
      autonomyLevel: 'supervised',
      status: 'active',
    }).returning();
    testIds.agentId = agent!.id;
    assert(!!agent, 'Create agent TestBot-001', `id=${agent?.id}`);

    // Assign agent to the first deliverable (Landing Page)
    const landingPage = delRows.find(d => d.title === 'Landing Page');
    if (landingPage) {
      const [assignedDel] = await db
        .update(deliverables)
        .set({ assignedAgentId: agent!.id, updatedAt: new Date() })
        .where(eq(deliverables.id, landingPage.id))
        .returning();
      assert(assignedDel?.assignedAgentId === agent!.id, 'Agent assigned to Landing Page deliverable');
    } else {
      log('Agent assignment', 'FAIL', 'Landing Page deliverable not found');
    }

    // ── Step 12: Generate agent connection token ──
    console.log('\nStep 12: Connect agent (generate JWT)');

    // Import the agent-auth helper dynamically
    const { createAgentToken, verifyAgentToken } = await import('../lib/agent-auth');

    const token = await createAgentToken(agent!.id, bob!.id, agent!.name);
    assert(token.length > 50, 'Agent token generated', `length=${token.length}`);

    // ── Step 13: Verify agent token ──
    console.log('\nStep 13: Verify agent token');

    const decoded = await verifyAgentToken(token);
    assert(decoded !== null, 'Token decodes successfully');
    assert(decoded?.agentId === agent!.id, 'Token contains correct agentId', `agentId=${decoded?.agentId}`);
    assert(decoded?.ownerId === bob!.id, 'Token contains correct ownerId', `ownerId=${decoded?.ownerId}`);
    assert(decoded?.agentName === 'TestBot-001', 'Token contains correct agentName', `agentName=${decoded?.agentName}`);

    // Verify an invalid token fails
    const badResult = await verifyAgentToken('invalid.token.here');
    assert(badResult === null, 'Invalid token correctly rejected');

    // ── Step 14: Test agent action queue ──
    console.log('\nStep 14: Test agent action queue');

    const [queuedAction] = await db.insert(agentActionQueue).values({
      contractId: contract!.id,
      agentId: agent!.id,
      actionType: 'status_change',
      payload: { deliverableId: landingPage?.id, newStatus: 'in_progress' },
      status: 'pending',
    }).returning();
    assert(!!queuedAction, 'Agent action queued', `id=${queuedAction?.id}, type=${queuedAction?.actionType}`);

    // Simulate review (approve)
    const [reviewedAction] = await db
      .update(agentActionQueue)
      .set({
        status: 'approved',
        reviewedById: bob!.id,
        reviewNote: 'Approved, proceed.',
        reviewedAt: new Date(),
      })
      .where(eq(agentActionQueue.id, queuedAction!.id))
      .returning();
    assert(reviewedAction?.status === 'approved', 'Agent action approved by lead');

  } catch (err) {
    console.error('\n  UNEXPECTED ERROR:', err);
    failed++;
  } finally {
    // ── Cleanup ──
    console.log('\nStep 15: Cleanup');
    await cleanupTestData(testIds);
  }

  // ── Summary ──
  console.log('========================================');
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
