'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createWalletClient, custom, type WalletClient, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '84532');
const TARGET_CHAIN = TARGET_CHAIN_ID === 8453 ? base : baseSepolia;

interface Web3Context {
  walletClient: WalletClient | null;
  address: Address | null;
  isConnected: boolean;
  connecting: boolean;
  connect: () => Promise<Address | null>;
  switchAccount: () => Promise<Address | null>;
  disconnect: () => void;
  targetChain: typeof TARGET_CHAIN;
}

const Web3Ctx = createContext<Web3Context>({
  walletClient: null,
  address: null,
  isConnected: false,
  connecting: false,
  connect: async () => null,
  switchAccount: async () => null,
  disconnect: () => {},
  targetChain: TARGET_CHAIN,
});

export function useWeb3() {
  return useContext(Web3Ctx);
}

async function ensureCorrectChain(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) return false;
  try {
    const currentChainHex = await window.ethereum.request({ method: 'eth_chainId' }) as string;
    const currentChainId = parseInt(currentChainHex, 16);
    if (currentChainId === TARGET_CHAIN_ID) return true;

    const targetHex = `0x${TARGET_CHAIN_ID.toString(16)}`;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetHex }],
      });
      return true;
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: targetHex,
            chainName: TARGET_CHAIN.name,
            nativeCurrency: TARGET_CHAIN.nativeCurrency,
            rpcUrls: [TARGET_CHAIN.rpcUrls.default.http[0]],
            blockExplorerUrls: TARGET_CHAIN.blockExplorers
              ? [TARGET_CHAIN.blockExplorers.default.url]
              : [],
          }],
        });
        return true;
      }
      throw switchError;
    }
  } catch {
    return false;
  }
}

function buildClient(addr: Address): WalletClient {
  return createWalletClient({
    account: addr,
    chain: TARGET_CHAIN,
    transport: custom(window.ethereum!),
  });
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);
  const pendingRef = useRef(false);

  // Auto-reconnect on mount (silent — no popup)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(async (accounts: unknown) => {
        const accts = accounts as Address[];
        if (accts.length > 0) {
          await ensureCorrectChain();
          setWalletClient(buildClient(accts[0]!));
          setAddress(accts[0]!);
        }
      }).catch(() => {});

      // Listen for account changes (user switches in MetaMask)
      window.ethereum.on('accountsChanged', (accounts: unknown) => {
        const accts = accounts as Address[];
        if (accts.length > 0) {
          setWalletClient(buildClient(accts[0]!));
          setAddress(accts[0]!);
        } else {
          setWalletClient(null);
          setAddress(null);
        }
      });
    }
  }, []);

  const connect = useCallback(async (): Promise<Address | null> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or another wallet.');
    }
    if (pendingRef.current) return null;
    pendingRef.current = true;
    setConnecting(true);

    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' }) as Address[];
      await ensureCorrectChain();
      setWalletClient(buildClient(addr!));
      setAddress(addr!);
      return addr!;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already pending') || message.includes('Already processing')) return null;
      throw err;
    } finally {
      pendingRef.current = false;
      setConnecting(false);
    }
  }, []);

  // Force MetaMask to show account picker (switch accounts)
  const switchAccount = useCallback(async (): Promise<Address | null> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected.');
    }
    if (pendingRef.current) return null;
    pendingRef.current = true;
    setConnecting(true);

    try {
      // wallet_requestPermissions forces the account chooser popup
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });

      // After permission granted, get the selected account
      const [addr] = await window.ethereum.request({ method: 'eth_accounts' }) as Address[];
      if (addr) {
        await ensureCorrectChain();
        setWalletClient(buildClient(addr));
        setAddress(addr);
        return addr;
      }
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already pending') || message.includes('Already processing')) return null;
      throw err;
    } finally {
      pendingRef.current = false;
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWalletClient(null);
    setAddress(null);
  }, []);

  return (
    <Web3Ctx.Provider value={{
      walletClient, address, isConnected: !!address, connecting,
      connect, switchAccount, disconnect, targetChain: TARGET_CHAIN,
    }}>
      {children}
    </Web3Ctx.Provider>
  );
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}
