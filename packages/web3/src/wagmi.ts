import { http, createConfig } from 'wagmi';
import { base, baseSepolia, celo, celoAlfajores } from 'wagmi/chains';

export const config = createConfig({
  chains: [base, baseSepolia, celo, celoAlfajores],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
});
