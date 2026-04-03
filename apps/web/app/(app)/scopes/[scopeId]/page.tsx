import Link from 'next/link';

const MOCK_SCOPES: Record<string, {
  id: string;
  title: string;
  narrative: string;
  categoryTags: string[];
  budgetMin: string;
  budgetMax: string;
  timelineDays: number;
  feedbackRounds: number;
  trustThreshold: string;
  confidentiality: string;
  biddingDeadline: string;
  status: string;
  workPlan?: {
    summary: string;
    milestones: { title: string; description: string; days: number }[];
  };
}> = {
  'mock-1': {
    id: 'mock-1',
    title: 'Build a Regenerative Finance Dashboard',
    narrative:
      'We need a web dashboard that visualizes regenerative finance metrics including carbon credits, community investments, and impact tracking. The dashboard should support real-time data feeds, interactive charts, and exportable reports. It must integrate with existing DeFi protocols and present data in an accessible way for non-technical stakeholders.',
    categoryTags: ['web development', 'DeFi', 'data visualization'],
    budgetMin: '5000',
    budgetMax: '12000',
    timelineDays: 30,
    feedbackRounds: 3,
    trustThreshold: 'verified',
    confidentiality: 'public',
    biddingDeadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'open',
    workPlan: {
      summary:
        'Three-phase delivery: data integration layer, visualization components, and stakeholder dashboard with export capabilities.',
      milestones: [
        { title: 'Data Integration', description: 'Connect to DeFi protocols and set up real-time data pipelines.', days: 10 },
        { title: 'Visualization Layer', description: 'Build interactive charts and metric displays.', days: 12 },
        { title: 'Dashboard & Export', description: 'Assemble dashboard UI, add export features, and conduct user testing.', days: 8 },
      ],
    },
  },
  'mock-2': {
    id: 'mock-2',
    title: 'Community Governance Toolkit Documentation',
    narrative:
      'Write comprehensive documentation for our governance toolkit including API references, user guides, and contribution guidelines. The documentation should be developer-friendly with code examples and clear explanations of governance mechanisms.',
    categoryTags: ['technical writing', 'governance', 'open source'],
    budgetMin: '2000',
    budgetMax: '4000',
    timelineDays: 14,
    feedbackRounds: 2,
    trustThreshold: 'open',
    confidentiality: 'public',
    biddingDeadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: 'open',
  },
  'mock-3': {
    id: 'mock-3',
    title: 'AI Agent Integration for Supply Chain Tracking',
    narrative:
      'Integrate AI agents to track and verify supply chain data on-chain. The system should use autonomous agents to monitor shipment status, verify authenticity, and trigger smart contract actions based on real-world events.',
    categoryTags: ['AI/ML', 'supply chain', 'smart contracts'],
    budgetMin: '15000',
    budgetMax: '25000',
    timelineDays: 60,
    feedbackRounds: 4,
    trustThreshold: 'trusted',
    confidentiality: 'nda_required',
    biddingDeadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    status: 'open',
    workPlan: {
      summary:
        'Agent architecture design, on-chain integration, and end-to-end testing with simulated supply chain events.',
      milestones: [
        { title: 'Architecture & Design', description: 'Design multi-agent system and smart contract interfaces.', days: 15 },
        { title: 'Agent Development', description: 'Build AI agents for monitoring and verification.', days: 25 },
        { title: 'Integration & Testing', description: 'Connect agents to smart contracts and run simulations.', days: 20 },
      ],
    },
  },
  'mock-4': {
    id: 'mock-4',
    title: 'Mobile App for Cooperative Membership',
    narrative:
      'Build a mobile application for managing cooperative memberships including onboarding, voting, and resource allocation features.',
    categoryTags: ['mobile', 'React Native', 'cooperatives'],
    budgetMin: '8000',
    budgetMax: '15000',
    timelineDays: 45,
    feedbackRounds: 3,
    trustThreshold: 'verified',
    confidentiality: 'public',
    biddingDeadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'open',
  },
  'mock-5': {
    id: 'mock-5',
    title: 'Carbon Credit Verification Smart Contract Audit',
    narrative:
      'Perform a security audit of our carbon credit verification smart contracts. This includes static analysis, formal verification where possible, and manual code review.',
    categoryTags: ['smart contracts', 'security', 'sustainability'],
    budgetMin: '10000',
    budgetMax: '18000',
    timelineDays: 21,
    feedbackRounds: 2,
    trustThreshold: 'elite',
    confidentiality: 'nda_required',
    biddingDeadline: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: 'open',
  },
  'mock-6': {
    id: 'mock-6',
    title: 'Brand Identity for Regenerative Agriculture Platform',
    narrative:
      'Design a complete brand identity for our regenerative agriculture platform including logo, color palette, typography, and brand guidelines document.',
    categoryTags: ['design', 'branding', 'agriculture'],
    budgetMin: '3000',
    budgetMax: '6000',
    timelineDays: 21,
    feedbackRounds: 3,
    trustThreshold: 'open',
    confidentiality: 'public',
    biddingDeadline: new Date(Date.now() + 8 * 86400000).toISOString(),
    status: 'open',
  },
};

function formatBudget(min: string, max: string) {
  if (!min && !max) return 'Open budget';
  const fmt = (v: string) =>
    Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
}

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diff / 86400000));
  if (days === 0) return 'Closing today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

const trustColors: Record<string, string> = {
  open: 'bg-bg-secondary text-text-secondary',
  verified: 'bg-accent-agent/10 text-accent-agent',
  trusted: 'bg-accent-client/10 text-accent-client',
  elite: 'bg-accent-squad/10 text-accent-squad',
};

const confidentialityLabels: Record<string, string> = {
  public: 'Public',
  nda_required: 'NDA Required',
  invite_only: 'Invite Only',
};

export default async function ScopeDetailPage({
  params,
}: {
  params: Promise<{ scopeId: string }>;
}) {
  const { scopeId } = await params;
  const scope = MOCK_SCOPES[scopeId];

  if (!scope) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h1 className="text-xl font-semibold text-text-primary mb-2">Scope Not Found</h1>
          <p className="text-text-secondary text-sm mb-4">
            This scope may have been removed or the link is incorrect.
          </p>
          <Link
            href="/scopes"
            className="text-sm text-accent-squad hover:underline font-medium"
          >
            Back to Scope Board
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/scopes"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Scope Board
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-border p-6 sm:p-8 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-text-primary">{scope.title}</h1>
          <span className="text-xs text-text-secondary whitespace-nowrap pt-1">
            {daysLeft(scope.biddingDeadline)}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {scope.categoryTags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-bg-secondary text-text-secondary text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Narrative */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-text-primary mb-2">Scope Narrative</h2>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {scope.narrative}
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-bg-primary rounded-lg border border-border">
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Budget</p>
            <p className="text-sm font-medium text-text-primary">
              {formatBudget(scope.budgetMin, scope.budgetMax)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Timeline</p>
            <p className="text-sm font-medium text-text-primary">{scope.timelineDays} days</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Feedback Rounds</p>
            <p className="text-sm font-medium text-text-primary">{scope.feedbackRounds}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Trust Threshold</p>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${trustColors[scope.trustThreshold] ?? trustColors.open}`}
            >
              {scope.trustThreshold}
            </span>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Confidentiality</p>
            <p className="text-sm font-medium text-text-primary">
              {confidentialityLabels[scope.confidentiality] ?? scope.confidentiality}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Status</p>
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium capitalize bg-success/10 text-success">
              {scope.status}
            </span>
          </div>
        </div>
      </div>

      {/* Work Plan */}
      {scope.workPlan && (
        <div className="bg-white rounded-xl border border-border p-6 sm:p-8 mb-5">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Work Plan</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            {scope.workPlan.summary}
          </p>

          <div className="space-y-3">
            {scope.workPlan.milestones.map((milestone, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg border border-border"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-agent/10 text-accent-agent text-xs font-semibold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-text-primary">{milestone.title}</h3>
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      {milestone.days} days
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-white rounded-xl border border-border p-6 sm:p-8 text-center">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Ready to work on this scope?
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Submit a bid to show your interest and proposed approach.
        </p>
        <Link
          href={`/bids/new?scopeId=${scope.id}`}
          className="inline-block py-2.5 px-6 bg-accent-squad text-white rounded-lg text-sm font-medium
                     hover:opacity-90 transition-opacity"
        >
          Start a Bid
        </Link>
      </div>
    </div>
  );
}
