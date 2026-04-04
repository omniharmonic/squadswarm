'use client';

import { useState } from 'react';
import { useWeb3 } from '@/components/web3-provider';

const ONRAMPS = [
  {
    name: 'MoonPay',
    url: 'https://www.moonpay.com/buy/usdc',
    description: 'Buy USDC with card or bank transfer',
  },
  {
    name: 'Transak',
    url: 'https://global.transak.com/',
    description: 'Fiat-to-crypto gateway, 100+ countries',
  },
  {
    name: 'Coinbase',
    url: 'https://www.coinbase.com/',
    description: 'Buy on Coinbase, then send to Base',
  },
];

export function OnrampWidget() {
  const [open, setOpen] = useState(false);
  const { address } = useWeb3();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-accent-agent hover:underline font-medium"
      >
        Need USDC?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl border border-border shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Buy USDC
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-text-secondary mb-5">
              Fund your wallet with USDC on Base to make payments.
            </p>

            {/* Onramp links */}
            <div className="space-y-2 mb-5">
              {ONRAMPS.map((ramp) => (
                <a
                  key={ramp.name}
                  href={ramp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent-agent/40 hover:bg-accent-agent/5 transition-colors group"
                >
                  <div>
                    <span className="text-sm font-medium text-text-primary group-hover:text-accent-agent transition-colors">
                      {ramp.name}
                    </span>
                    <p className="text-xs text-text-secondary">{ramp.description}</p>
                  </div>
                  <svg className="w-4 h-4 text-text-secondary group-hover:text-accent-agent transition-colors flex-shrink-0 ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </a>
              ))}
            </div>

            {/* Instructions */}
            <div className="bg-bg-primary rounded-lg p-4 border border-border mb-5">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                How it works
              </p>
              <ol className="text-sm text-text-secondary space-y-1.5 list-decimal list-inside">
                <li>Buy USDC on one of the platforms above</li>
                <li>Send to your wallet on <span className="font-medium text-text-primary">Base network</span></li>
                <li>Return here to fund your contract</li>
              </ol>
            </div>

            {/* Wallet address */}
            {address && (
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  Your wallet address
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-bg-primary px-3 py-2 rounded border border-border text-text-primary flex-1 truncate">
                    {address}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-2 text-xs font-medium rounded border border-border hover:border-accent-agent/40 hover:bg-accent-agent/5 transition-colors whitespace-nowrap"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
