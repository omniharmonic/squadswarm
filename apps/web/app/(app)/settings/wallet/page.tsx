'use client';

export default function WalletSettingsPage() {
  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Wallet Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Connect and manage your wallet for payments and payouts.</p>
      </div>

      {/* Connection Status */}
      <section className="bg-white rounded-xl border border-border p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Web3 Status</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary">
            Not Connected
          </span>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          Connect your wallet to enable crypto payments, smart contract escrow, and on-chain reputation attestations.
        </p>

        <button className="px-5 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad/90 transition-colors">
          Connect Wallet
        </button>
      </section>

      {/* Supported Networks */}
      <section className="bg-white rounded-xl border border-border p-6 mb-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Supported Networks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Base */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-bg-primary">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Base</p>
              <p className="text-xs text-text-secondary">Ethereum L2 by Coinbase</p>
            </div>
          </div>

          {/* Celo */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-bg-primary">
            <div className="w-10 h-10 rounded-full bg-emerald-400 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Celo</p>
              <p className="text-xs text-text-secondary">Mobile-first EVM chain</p>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Features */}
      <section className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Upcoming Features
          </h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-agent/10 text-accent-agent">
            Coming in Phase 7
          </span>
        </div>
        <ul className="space-y-3">
          {[
            { title: 'Smart Contract Escrow', description: 'Automated milestone-based payment releases through on-chain escrow contracts.' },
            { title: 'On-Chain Reputation', description: 'Soulbound attestations for completed contracts, verified skills, and trust scores.' },
            { title: 'Multi-Sig Treasury', description: 'Squad treasuries managed by multi-signature wallets with governance-based approvals.' },
            { title: 'Token-Gated Access', description: 'Require specific tokens or NFTs for squad membership or client access.' },
          ].map((feature) => (
            <li key={feature.title} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-agent mt-2 shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">{feature.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
