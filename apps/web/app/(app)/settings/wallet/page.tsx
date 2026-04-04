'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useWeb3 } from '@/components/web3-provider';

interface User {
  walletAddress: string | null;
  web3Enabled: boolean;
}

export default function WalletSettingsPage() {
  const { connect, address, isConnected, disconnect, connecting } = useWeb3();
  const [user, setUser] = useState<User | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setUser(d); })
      .catch(() => {});
  }, []);

  async function handleLinkWallet() {
    if (linking || connecting) return;
    if (!isConnected || !address) {
      try { await connect(); } catch { return; }
    }
    setLinking(true);
    try {
      const nonceRes = await fetch('/api/auth/siwe');
      const { nonce } = await nonceRes.json();

      const message = [
        `${window.location.host} wants you to sign in with your Ethereum account:`,
        address,
        '',
        'Link wallet to SquadSwarm account.',
        '',
        `URI: ${window.location.origin}`,
        `Version: 1`,
        `Chain ID: 8453`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join('\n');

      const signature = await window.ethereum?.request({
        method: 'personal_sign',
        params: [message, address],
      });

      const res = await fetch('/api/auth/siwe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (res.ok) {
        toast.success('Wallet linked!');
        setUser((prev) => prev ? { ...prev, walletAddress: address!, web3Enabled: true } : prev);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      if (
        !msg.includes('User rejected') &&
        !msg.includes('already pending') &&
        !msg.includes('Already processing')
      ) {
        toast.error(msg);
      }
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Wallet & Web3</h1>
        <p className="text-text-secondary mt-1">Connect your wallet to enable crypto payments and on-chain reputation.</p>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Wallet Connection</h2>

        {user?.walletAddress ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm font-medium">Wallet Linked</span>
            </div>
            <div className="p-3 bg-bg-primary rounded-lg border border-border font-mono text-sm break-all">
              {user.walletAddress}
            </div>
            <p className="text-xs text-text-secondary">Your wallet is linked to your account. You can use crypto payments and earn on-chain attestations.</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-text-secondary mb-4">
              {isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'No wallet connected'}
            </p>
            <button onClick={isConnected ? handleLinkWallet : async () => { try { await connect(); } catch {} }}
              disabled={linking || connecting}
              className="px-6 py-2.5 bg-accent-agent text-white rounded-xl text-sm font-medium hover:bg-accent-agent-hover transition-colors disabled:opacity-50">
              {linking ? 'Linking...' : isConnected ? 'Link Wallet to Account' : 'Connect Wallet'}
            </button>
          </div>
        )}
      </div>

      {/* Supported Networks */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Supported Networks</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Base', desc: 'Primary network for escrow contracts', color: 'bg-blue-500' },
            { name: 'Base Sepolia', desc: 'Testnet for development', color: 'bg-blue-300' },
            { name: 'Celo', desc: 'Mobile-first, carbon-negative', color: 'bg-yellow-500' },
            { name: 'Celo Alfajores', desc: 'Celo testnet', color: 'bg-yellow-300' },
          ].map((n) => (
            <div key={n.name} className="p-3 bg-bg-primary rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${n.color}`} />
                <span className="text-sm font-medium">{n.name}</span>
              </div>
              <p className="text-xs text-text-secondary">{n.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Web3 Features */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Web3 Features</h2>
        <div className="space-y-3">
          {[
            { name: 'Smart Contract Escrow', desc: 'USDC-based escrow with milestone releases', ready: true },
            { name: 'EAS Attestations', desc: 'On-chain reputation and skill verification', ready: true },
            { name: 'Squad Multisig', desc: 'Gnosis Safe wallet for squad treasury', ready: false },
            { name: 'Token-Gated Access', desc: 'Exclusive scopes for token holders', ready: false },
          ].map((f) => (
            <div key={f.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <span className="text-sm font-medium">{f.name}</span>
                <p className="text-xs text-text-secondary">{f.desc}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${f.ready ? 'bg-success/10 text-success' : 'bg-accent-agent/10 text-accent-agent'}`}>
                {f.ready ? 'Available' : 'Coming soon'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
