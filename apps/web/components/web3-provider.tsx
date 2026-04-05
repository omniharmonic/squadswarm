'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createWalletClient, custom, type WalletClient, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Determine the target chain from env — defaults to Base Sepolia for testnet
const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '84532');
const TARGET_CHAIN = TARGET_CHAIN_ID === 8453 ? base : baseSepolia;

interface Web3Context {
  walletClient: WalletClient | null;
  address: Address | null;
  isConnected: boolean;
  connecting: boolean;
  connect: () => Promise<Address | null>;
  disconnect: () => void;
  targetChain: typeof TARGET_CHAIN;
}

const Web3Ctx = createContext<Web3Context>({
  walletClient: null,
  address: null,
  isConnected: false,
  connecting: false,
  connect: async () => null,
  disconnect: () => {},
  targetChain: TARGET_CHAIN,
});

export function useWeb3() {
  return useContext(Web3Ctx);
}

/** Request the wallet to switch to our target chain. Returns true on success. */
async function ensureCorrectChain(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) return false;

  try {
    const currentChainHex = await window.ethereum.request({ method: 'eth_chainId' }) as string;
    const currentChainId = parseInt(currentChainHex, 16);

    if (currentChainId === TARGET_CHAIN_ID) return true;

    // Request chain switch
    const targetHex = `0x${TARGET_CHAIN_ID.toString(16)}`;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetHex }],
      });
      return true;
    } catch (switchError: unknown) {
      // If the chain hasn't been added yet, add it
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

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);
  const pendingRef = useRef(false);

  // Auto-reconnect on mount if wallet was previously connected
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(async (accounts: unknown) => {
        const accts = accounts as Address[];
        if (accts.length > 0) {
          await ensureCorrectChain();
          const client = createWalletClient({
            account: accts[0],
            chain: TARGET_CHAIN,
            transport: custom(window.ethereum!),
          });
          setWalletClient(client);
          setAddress(accts[0]!);
        }
      }).catch(() => {});
    }
  }, []);

  const connect = useCallback(async (): Promise<Address | null> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or another wallet.');
    }

    // Prevent duplicate requests
    if (pendingRef.current) {
      return null;
    }

    pendingRef.current = true;
    setConnecting(true);

    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' }) as Address[];

      // Ensure the wallet is on the correct chain
      await ensureCorrectChain();

      const client = createWalletClient({
        account: addr,
        chain: TARGET_CHAIN,
        transport: custom(window.ethereum),
      });

      setWalletClient(client);
      setAddress(addr!);
      return addr!;
    } catch (err: unknown) {
      // Handle "request already pending" error gracefully
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already pending') || message.includes('Already processing')) {
        // Silently ignore — MetaMask popup is already open
        return null;
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
    <Web3Ctx.Provider value={{ walletClient, address, isConnected: !!address, connecting, connect, disconnect, targetChain: TARGET_CHAIN }}>
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
