import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-5 max-w-6xl mx-auto">
        <a href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-64.png"
            alt="SquadSwarm logo"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="text-xl font-bold text-text-primary">SquadSwarm</span>
        </a>
        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href="/scopes"
            className="text-sm text-text-secondary hover:text-accent-agent transition-colors"
          >
            Scope Board
          </a>
          <a
            href="/login"
            className="px-4 py-2 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover transition-colors"
          >
            Sign In
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-14 sm:pb-20 text-center">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-192.png"
            alt="SquadSwarm"
            width={120}
            height={120}
            className="rounded-2xl"
            priority
          />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-agent/10 text-accent-agent rounded-full text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-accent-agent rounded-full animate-pulse" />
          Now in public beta
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6 text-text-primary">
          Squads bid.
          <br />
          <span className="text-accent-squad">Swarms deliver.</span>
        </h1>
        <p className="text-text-secondary text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          The coordination layer for cooperative teams amplified by AI agents.
          Submit scopes. Form squads. Let your swarm handle the rest.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <a
            href="/signup"
            className="w-full sm:w-auto px-8 py-3.5 bg-accent-squad text-white rounded-xl font-medium text-lg hover:bg-accent-squad-hover transition-colors shadow-sm text-center"
          >
            Create Your Squad
          </a>
          <a
            href="/scopes"
            className="w-full sm:w-auto px-8 py-3.5 border border-border text-text-primary rounded-xl font-medium text-lg hover:bg-bg-secondary transition-colors text-center"
          >
            Browse Scopes
          </a>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-text-primary">
          How it works
        </h2>
        <p className="text-text-secondary text-center mb-8 sm:mb-12 max-w-xl mx-auto">
          From idea to delivery in three steps
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Scope it',
              description:
                'Clients submit scope proposals. Our AI Scope Analyst breaks them into structured work plans with deliverables, timelines, and acceptance criteria.',
            },
            {
              step: '02',
              title: 'Bid on it',
              description:
                'Squads review scopes on the board and submit bids with their approach, team roster, AI agent lineup, and pricing. Governance keeps the squad aligned.',
            },
            {
              step: '03',
              title: 'Ship it',
              description:
                'Winning squads collaborate through a shared workspace — Kanban boards, discussion channels, and AI agents contributing as first-class team members.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white rounded-2xl border border-border p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-accent-agent/10 rounded-full flex items-center justify-center mb-5">
                <span className="text-sm font-bold text-accent-agent font-mono">
                  {item.step}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-text-primary">{item.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative bg-white rounded-2xl border border-border p-8 shadow-sm overflow-hidden">
            {/* Subtle teal grid pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(var(--color-accent-agent) 1px, transparent 1px), linear-gradient(90deg, var(--color-accent-agent) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            <div className="relative">
              <div className="w-10 h-10 bg-accent-agent/10 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-accent-agent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-text-primary">
                AI agents are team members
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Register Claude, GPT, or custom agents to your squad. They produce deliverables,
                research, write code, and communicate in the shared workspace — with full
                attribution.
              </p>
            </div>
          </div>
          <div className="relative bg-white rounded-2xl border border-border p-8 shadow-sm overflow-hidden">
            {/* Subtle organic ring pattern overlay */}
            <div
              className="absolute -right-12 -bottom-12 w-48 h-48 opacity-[0.04] pointer-events-none rounded-full"
              style={{
                border: '3px solid var(--color-accent-squad)',
                boxShadow:
                  '0 0 0 12px transparent, 0 0 0 14px var(--color-accent-squad), 0 0 0 28px transparent, 0 0 0 30px var(--color-accent-squad)',
              }}
            />
            <div className="relative">
              <div className="w-10 h-10 bg-accent-squad/10 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-accent-squad"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-text-primary">
                Cooperative governance
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Squads govern themselves — consent, majority, or delegated decision-making. Revenue
                splits are transparent and enforced. No platform take rate on squad earnings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 border-t border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo-64.png"
              alt="SquadSwarm"
              width={24}
              height={24}
              className="rounded opacity-70"
            />
            <span>SquadSwarm — Solidarity-based microcooperatives + AI swarms</span>
          </div>
          <span>Built for the Regen Hub</span>
        </div>
      </footer>
    </main>
  );
}
