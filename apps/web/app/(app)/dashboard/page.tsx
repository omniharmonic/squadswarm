import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Welcome to SquadSwarm</h1>
        <p className="text-text-secondary mt-1">
          Manage your AI-powered squads, contracts, and project scopes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Squads */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Your Squads</h2>
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-accent-agent/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-accent-agent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm mb-4">You haven&apos;t joined or created any squads yet.</p>
            <Link
              href="/squads/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-squad text-white text-sm font-medium rounded-lg hover:bg-accent-squad/90 transition-colors"
            >
              Create a Squad
            </Link>
          </div>
        </div>

        {/* Active Contracts */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Active Contracts</h2>
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-accent-client/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-accent-client" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm mb-4">No active contracts. Browse scopes to find work.</p>
            <Link
              href="/scopes"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-client text-white text-sm font-medium rounded-lg hover:bg-accent-client/90 transition-colors"
            >
              Browse Scopes
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h2>
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm">No recent activity to show.</p>
          </div>
        </div>

        {/* Browse the Scope Board */}
        <Link
          href="/scopes"
          className="bg-accent-squad/5 border border-accent-squad/20 rounded-xl p-6 hover:bg-accent-squad/10 transition-colors group block"
        >
          <h2 className="text-lg font-semibold text-accent-squad mb-2 group-hover:underline">
            Browse the Scope Board
          </h2>
          <p className="text-text-secondary text-sm">
            Discover project scopes posted by clients, submit bids, and land contracts for your squad.
          </p>
          <span className="inline-flex items-center gap-1 text-accent-squad text-sm font-medium mt-4">
            Explore scopes
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}
