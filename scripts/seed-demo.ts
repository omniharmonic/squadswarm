/**
 * Demo seed script — run against production Neon to populate
 * realistic data for the Regen Hub demo.
 *
 * Usage: npx tsx scripts/seed-demo.ts
 *
 * Requires DATABASE_URL environment variable.
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function seed() {
  console.log('Seeding demo data...');

  // Check if demo data already exists
  const existing = await sql`SELECT count(*) as c FROM scopes WHERE title = 'Community Currency Design for Local Food Network'`;
  if (Number(existing[0]?.c) > 0) {
    console.log('Demo data already seeded. Skipping.');
    return;
  }

  // Get the first user to assign as client
  const users = await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`;
  if (users.length === 0) {
    console.log('No users found. Sign up first, then run this script.');
    return;
  }
  const clientId = users[0]!.id;

  // Create demo scopes directly (already analyzed + published)
  const demoScopes = [
    {
      title: 'Community Currency Design for Local Food Network',
      narrative: 'Design and implement a complementary community currency system for a network of 30 local farms and 200+ households. The currency should incentivize local food purchasing, reduce food waste, and strengthen community bonds. Needs mobile app, merchant POS integration, and quarterly impact reporting.',
      categoryTags: ['fintech', 'community', 'mobile', 'sustainability'],
      budgetMin: '12000',
      budgetMax: '20000',
      timelineDays: 45,
      trustThreshold: 'verified',
    },
    {
      title: 'Open Source Governance Toolkit for Worker Cooperatives',
      narrative: 'Build an open-source toolkit that enables worker cooperatives to run transparent governance processes: proposal submission, deliberation, consent-based decision making, and record keeping. Must support async voting, meeting facilitation, and integration with existing tools (Slack, Notion, Discord).',
      categoryTags: ['governance', 'open source', 'cooperatives', 'web development'],
      budgetMin: '8000',
      budgetMax: '15000',
      timelineDays: 60,
      trustThreshold: 'open',
    },
    {
      title: 'Bioregional Mapping Platform with Ecological Data',
      narrative: 'Create an interactive mapping platform that visualizes bioregional boundaries, watershed data, soil health indicators, and community resource locations. Should integrate with USDA soil data, EPA watershed boundaries, and allow community members to contribute local ecological knowledge. Mobile-responsive with offline support.',
      categoryTags: ['mapping', 'ecology', 'data visualization', 'GIS'],
      budgetMin: '15000',
      budgetMax: '25000',
      timelineDays: 90,
      trustThreshold: 'trusted',
    },
    {
      title: 'Mutual Aid Network Coordination App',
      narrative: 'Build a mobile-first web app for coordinating mutual aid networks. Core features: request/offer matching, driver route optimization for deliveries, volunteer hour tracking, resource inventory management, and multilingual support (English, Spanish, Mandarin). Must work on low-bandwidth connections.',
      categoryTags: ['mutual aid', 'mobile', 'logistics', 'social impact'],
      budgetMin: '6000',
      budgetMax: '12000',
      timelineDays: 30,
      trustThreshold: 'open',
    },
  ];

  for (const scope of demoScopes) {
    const deadline = new Date(Date.now() + (5 + Math.random() * 10) * 86400000);
    await sql`
      INSERT INTO scopes (client_id, title, narrative, category_tags, budget_min, budget_max, timeline_days, trust_threshold, bidding_deadline, status, work_plan)
      VALUES (${clientId}, ${scope.title}, ${scope.narrative}, ${JSON.stringify(scope.categoryTags)}, ${scope.budgetMin}, ${scope.budgetMax}, ${scope.timelineDays}, ${scope.trustThreshold}, ${deadline.toISOString()}, 'open', ${JSON.stringify({ type: 'work_plan', summary: 'AI-generated work plan pending' })})
    `;
    console.log(`  ✓ ${scope.title}`);
  }

  console.log(`\nSeeded ${demoScopes.length} demo scopes.`);
}

seed().catch(console.error);
