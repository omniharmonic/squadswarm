'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createWalletClient, custom, type WalletClient, type Address } from 'viem';
import { base } from 'viem/chains';

interface Web3Context {
  walletClient: WalletClient | null;
  address: Address | null;
  isConnected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const Web3Ctx = createContext<Web3Context>({
  walletClient: null,
  address: null,
  isConnected: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function useWeb3() {
  return useContext(Web3Ctx);
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);
  const pendingRef = useRef(false);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or another wallet.');
    }

    // Prevent duplicate requests
    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;
    setConnecting(true);

    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' }) as Address[];
      const client = createWalletClient({
        account: addr,
        chain: base,
        transport: custom(window.ethereum),
      });

      setWalletClient(client);
      setAddress(addr!);
    } catch (err: unknown) {
      // Handle "request already pending" error gracefully
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already pending') || message.includes('Already processing')) {
        // Silently ignore — MetaMask popup is already open
        return;
      }
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
    <Web3Ctx.Provider value={{ walletClient, address, isConnected: !!address, connecting, connect, disconnect }}>
      {children}
    </Web3Ctx.Provider>
  );
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}
