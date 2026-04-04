'use client';

interface AttestationBadgeProps {
  uid: string;
  schemaName: string;
  timestamp: number;
  /** Base Sepolia explorer by default; pass 'mainnet' for Base mainnet */
  network?: 'testnet' | 'mainnet';
  size?: 'sm' | 'md';
}

const EAS_EXPLORER = {
  testnet: 'https://base-sepolia.easscan.org/attestation/view',
  mainnet: 'https://base.easscan.org/attestation/view',
};

export function AttestationBadge({
  uid,
  schemaName,
  timestamp,
  network = 'testnet',
  size = 'sm',
}: AttestationBadgeProps) {
  const explorerUrl = `${EAS_EXPLORER[network]}/${uid}`;
  const date = new Date(timestamp * 1000).toLocaleDateString();

  if (size === 'md') {
    return (
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-success/30 bg-success/5 text-success hover:bg-success/10 transition-colors"
        title={`Verified on-chain: ${schemaName}`}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span>{schemaName}</span>
        <span className="text-success/60">{date}</span>
      </a>
    );
  }

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-success/30 bg-success/5 text-success hover:bg-success/10 transition-colors"
      title={`Verified on-chain: ${schemaName}`}
    >
      <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      Verified
    </a>
  );
}
