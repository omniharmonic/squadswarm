/**
 * Seed multi-user test data for comprehensive E2E testing.
 * Creates a realistic scenario with:
 * - 3 users (client + 2 squad members)
 * - 1 squad with consent governance
 * - 1 agent owned by a squad member
 * - 1 scope with AI work plan (3 workstreams, 5 deliverables)
 * - Published and ready for bidding
 *
 * Usage: source apps/web/.env.local && npx tsx apps/web/scripts/seed-multi-user-test.ts
 */

import { neon } from '@neondatabase/serverless';
import { SignJWT } from 'jose';

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sql = neon(DATABASE_URL);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

async function createToken(userId: string, email: string) {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

async function main() {
  console.log('=== Seeding Multi-User Test Data ===\n');

  // 1. Create users
  console.log('1. Creating users...');
  const [alice] = await sql`
    INSERT INTO users (email, display_name, bio)
    VALUES ('alice-client@squadswarm.test', 'Alice Chen', 'Product manager at a regenerative agriculture startup. Looking for talented teams to build our platform.')
    ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id, email, display_name
  `;
  const [bob] = await sql`
    INSERT INTO users (email, display_name, bio)
    VALUES ('bob-lead@squadswarm.test', 'Bob Martinez', 'Full-stack developer and squad lead. 8 years building cooperative platforms.')
    ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id, email, display_name
  `;
  const [carol] = await sql`
    INSERT INTO users (email, display_name, bio)
    VALUES ('carol-dev@squadswarm.test', 'Carol Williams', 'UI/UX designer and frontend developer. Passionate about accessible design.')
    ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id, email, display_name
  `;
  console.log(`   Alice (client): ${alice!.id}`);
  console.log(`   Bob (lead):     ${bob!.id}`);
  console.log(`   Carol (member): ${carol!.id}`);

  // 2. Create squad
  console.log('\n2. Creating squad...');
  const slug = `regenerative-builders-${Date.now()}`;
  const [squad] = await sql`
    INSERT INTO squads (name, slug, bio, mission_statement, governance_model, revenue_split_default, payment_mode)
    VALUES (
      'Regenerative Builders',
      ${slug},
      'A cooperative team building tools for regenerative economies',
      'Build open-source tools that empower local communities',
      ${{ type: 'consent', threshold: 100 }}::jsonb,
      ${{ lead: 30, members: 50, treasury: 20 }}::jsonb,
      'crypto'
    )
    RETURNING id, name, slug
  `;
  console.log(`   Squad: ${squad!.name} (${squad!.id})`);

  // Add members
  await sql`INSERT INTO squad_members (squad_id, user_id, role, permissions) VALUES (${squad!.id}, ${bob!.id}, 'admin', ${{ submit_bid: true, manage_members: true, manage_governance: true }}::jsonb)`;
  await sql`INSERT INTO squad_members (squad_id, user_id, role, permissions) VALUES (${squad!.id}, ${carol!.id}, 'member', ${{ submit_bid: true, manage_members: false, manage_governance: false }}::jsonb)`;
  console.log('   Added Bob (admin) + Carol (member)');

  // 3. Create agent
  console.log('\n3. Creating AI agent...');
  const [agent] = await sql`
    INSERT INTO agents (owner_id, name, description, provider, model, connection_type, capabilities, autonomy_level, payment_mode)
    VALUES (
      ${bob!.id},
      'CodeCraft AI',
      'Specialized in backend development, API design, and automated testing',
      'Anthropic',
      'Claude Haiku',
      'mcp',
      ${['backend development', 'API design', 'testing', 'documentation']}::jsonb,
      'trusted',
      'owner'
    )
    RETURNING id, name
  `;
  console.log(`   Agent: ${agent!.name} (${agent!.id})`);

  // 4. Create scope with work plan
  console.log('\n4. Creating scope with work plan...');

  // First create a scope proposal
  const [proposal] = await sql`
    INSERT INTO scope_proposals (client_id, title, narrative, category_tags, budget_min, budget_max, timeline_days, feedback_rounds, status, documentation_score)
    VALUES (
      ${alice!.id},
      'Community Seed Library Management Platform',
      'Build a web platform for managing community seed libraries. Features: seed catalog with varieties and growing guides, checkout/return system for seed lending, community growing calendar, harvest sharing board, and integration with local weather data. Must be mobile-friendly and work offline for garden use.',
      ${['web development', 'agriculture', 'community', 'mobile']}::jsonb,
      8000,
      15000,
      45,
      3,
      'published',
      85
    )
    RETURNING id
  `;

  const workPlan = {
    type: 'work_plan',
    summary: 'Full-stack web platform for community seed library management with offline-first mobile support.',
    estimatedTotalHours: 180,
    workstreams: [
      {
        title: 'Design & Architecture',
        orderIndex: 0,
        deliverables: [
          {
            title: 'UI/UX Design System & Wireframes',
            format: 'design',
            estimatedEffortHours: 24,
            requiredSkills: ['UI/UX Design', 'Figma'],
            acceptanceCriteria: ['Complete wireframes for all 5 core screens', 'Design system with component library', 'Mobile-responsive layouts'],
            description: 'Create the visual design system, component library, and wireframes for all platform screens including seed catalog, checkout, calendar, and sharing board.'
          },
          {
            title: 'Technical Architecture Document',
            format: 'document',
            estimatedEffortHours: 16,
            requiredSkills: ['System Architecture', 'API Design'],
            acceptanceCriteria: ['Database schema design', 'API endpoint documentation', 'Offline-first architecture plan', 'Deployment strategy'],
            description: 'Define the technical architecture including database schema, API design, offline sync strategy, and deployment infrastructure.'
          }
        ]
      },
      {
        title: 'Core Development',
        orderIndex: 1,
        deliverables: [
          {
            title: 'Seed Catalog & Search API',
            format: 'codebase',
            estimatedEffortHours: 48,
            requiredSkills: ['Backend Development', 'PostgreSQL', 'API Design'],
            acceptanceCriteria: ['CRUD operations for seed varieties', 'Full-text search with filters', 'Image upload for seed photos', 'Growing guide content management'],
            description: 'Build the backend API for the seed catalog including variety management, search, filtering, and growing guide content.'
          },
          {
            title: 'Checkout & Lending System',
            format: 'codebase',
            estimatedEffortHours: 40,
            requiredSkills: ['Full-Stack Development', 'React'],
            acceptanceCriteria: ['Seed checkout/return workflow', 'Availability tracking', 'User lending history', 'Overdue notifications'],
            description: 'Implement the seed lending system with checkout, return, availability tracking, and notification features.'
          }
        ]
      },
      {
        title: 'Frontend & Integration',
        orderIndex: 2,
        deliverables: [
          {
            title: 'Mobile-First Frontend with Offline Support',
            format: 'codebase',
            estimatedEffortHours: 52,
            requiredSkills: ['React', 'PWA', 'Offline-First'],
            acceptanceCriteria: ['PWA with offline caching', 'Service worker for background sync', 'Responsive design matching wireframes', 'Weather API integration'],
            description: 'Build the mobile-first frontend as a Progressive Web App with offline support, service worker sync, and weather data integration.'
          }
        ]
      }
    ]
  };

  const [scope] = await sql`
    INSERT INTO scopes (proposal_id, client_id, title, narrative, category_tags, budget_min, budget_max, timeline_days, feedback_rounds, trust_threshold, work_plan, bidding_deadline, status)
    VALUES (
      ${proposal!.id},
      ${alice!.id},
      'Community Seed Library Management Platform',
      'Build a web platform for managing community seed libraries. Features: seed catalog with varieties and growing guides, checkout/return system for seed lending, community growing calendar, harvest sharing board, and integration with local weather data. Must be mobile-friendly and work offline for garden use.',
      ${['web development', 'agriculture', 'community', 'mobile']}::jsonb,
      8000,
      15000,
      45,
      3,
      'open',
      ${workPlan}::jsonb,
      ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()},
      'open'
    )
    RETURNING id, title
  `;
  console.log(`   Scope: ${scope!.title} (${scope!.id})`);
  console.log(`   Work plan: 3 workstreams, 5 deliverables, 180 estimated hours`);

  // 5. Generate session tokens
  console.log('\n5. Session tokens for browser testing:');
  const aliceToken = await createToken(alice!.id as string, alice!.email as string);
  const bobToken = await createToken(bob!.id as string, bob!.email as string);
  const carolToken = await createToken(carol!.id as string, carol!.email as string);

  console.log(`\n   ALICE (client) — set this cookie to test as the scope owner:`);
  console.log(`   TOKEN=${aliceToken}`);
  console.log(`\n   BOB (squad lead) — set this cookie to test bidding + voting:`);
  console.log(`   TOKEN=${bobToken}`);
  console.log(`\n   CAROL (member) — set this cookie to test voting:`);
  console.log(`   TOKEN=${carolToken}`);

  console.log('\n=== Test Data Summary ===');
  console.log(`Scope ID:  ${scope!.id}`);
  console.log(`Squad ID:  ${squad!.id}`);
  console.log(`Agent ID:  ${agent!.id}`);
  console.log(`Alice ID:  ${alice!.id} (client)`);
  console.log(`Bob ID:    ${bob!.id} (squad lead)`);
  console.log(`Carol ID:  ${carol!.id} (squad member)`);
  console.log(`\nBid URL:   http://localhost:3000/bids/new?scopeId=${scope!.id}`);
  console.log(`Scope URL: http://localhost:3000/scopes/${scope!.id}`);

  console.log('\n=== How to Test ===');
  console.log('1. Open browser, set session cookie to BOB\'s token');
  console.log('2. Navigate to the Bid URL above');
  console.log('3. Select "Regenerative Builders" squad');
  console.log('4. Step 2: Assign Bob, Carol, and CodeCraft AI to deliverables');
  console.log('5. Step 3: Set payment splits (Bob 30%, Carol 25%, Agent 15%, Treasury 20%)');
  console.log('6. Step 4: Fill approach and pricing');
  console.log('7. Step 5: Submit for Squad Vote');
  console.log('8. Switch to CAROL\'s token → navigate to vote page → approve');
  console.log('9. Switch to ALICE\'s token → accept the bid → contract created');
  console.log('10. Open workspace → test board, messages, payments');
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
