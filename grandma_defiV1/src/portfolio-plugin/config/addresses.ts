export const ADDRESSES = {
  TokenFactory: "0x118B873495387990eA7E2FF5b8479381f778a5Be",
  PortfolioManager: "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1",
  wETH: "0x1e8a097E2942292264dFd840cE2328056Fec716c", // New balanced wETH
  wBTC: "0xcBe1f9dD7D64fce92Cf27B7E761cF0590a312DB8", // New balanced wBTC
  USDT: "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf", // Keep USDT18
  GRANDMA: "0xC93F278471594324242F911Fb4343D9bC2e57Dbc" // New balanced GRANDMA
};

export const SUPPORTED_TOKENS = [
  {
    address: "0x0000000000000000000000000000000000000000", // Native MNT
    symbol: "MNT",
    name: "Mantle",
    decimals: 18
  },
  {
    address: ADDRESSES.wETH,
    symbol: "wETH", 
    name: "Wrapped Ethereum",
    decimals: 18
  },
  {
    address: ADDRESSES.wBTC,
    symbol: "wBTC",
    name: "Wrapped Bitcoin", 
    decimals: 18
  },
  {
    address: ADDRESSES.USDT,
    symbol: "USDT18",
    name: "Tether USD 18",
    decimals: 18
  },
  {
    address: ADDRESSES.GRANDMA,
    symbol: "GRANDMA",
    name: "Grandma Token",
    decimals: 18
  }
];

export const NETWORK_CONFIG = {
  chainId: 5003, // Mantle Sepolia Testnet
  name: "Mantle Sepolia Testnet",
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  explorerUrl: "https://sepolia.mantlescan.xyz"
};
