export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold tracking-tight mb-4">SquadSwarm</h1>
      <p className="text-text-secondary text-xl max-w-2xl text-center mb-8">
        Cooperative work brokerage with AI-native project management.
        Squads bid. Swarms deliver.
      </p>
      <div className="flex gap-4">
        <a href="/login" className="px-6 py-3 bg-accent-squad text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
          Get Started
        </a>
        <a href="/scopes" className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-bg-secondary transition-colors">
          Browse Scopes
        </a>
      </div>
    </main>
  );
}
