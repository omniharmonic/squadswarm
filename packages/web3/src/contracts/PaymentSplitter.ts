export const PAYMENT_SPLITTER_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_members", type: "address[]", internalType: "address[]" },
      { name: "_shares", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "distribute",
    inputs: [{ name: "token", type: "address", internalType: "contract IERC20" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "members",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "shares",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalShares",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "released",
    inputs: [
      { name: "", type: "address", internalType: "contract IERC20" },
      { name: "", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalReleased",
    inputs: [{ name: "", type: "address", internalType: "contract IERC20" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "memberCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMembers",
    inputs: [],
    outputs: [
      { name: "", type: "address[]", internalType: "address[]" },
      { name: "", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingPayment",
    inputs: [
      { name: "token", type: "address", internalType: "contract IERC20" },
      { name: "member", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "PaymentDistributed",
    inputs: [
      { name: "token", type: "address", indexed: true, internalType: "address" },
      { name: "member", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MembersConfigured",
    inputs: [
      { name: "members", type: "address[]", indexed: false, internalType: "address[]" },
      { name: "shares", type: "uint256[]", indexed: false, internalType: "uint256[]" },
    ],
    anonymous: false,
  },
] as const;
