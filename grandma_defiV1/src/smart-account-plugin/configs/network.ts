// src/smart-account-plugin/configs/networks.ts

import { Chain, mantleSepoliaTestnet } from 'viem/chains';
// import { PimlicoBundlerRpc, PimlicoPaymasterRpc } from 'permissionless/types/pimlico';
import { entryPoint07Address } from 'viem/account-abstraction';

export interface PimlicoConfig {
  chain: Chain;
  bundlerUrl: string; 
  paymasterUrl: string;  
  entryPointAddress: string;
}

export const MANTLE_SEPOLIA_CONFIG: PimlicoConfig = {
  chain: mantleSepoliaTestnet,
  bundlerUrl: `https://api.pimlico.io/v2/${mantleSepoliaTestnet.id}/rpc?apikey=${process.env.PIMLICO_API_KEY}`,
  paymasterUrl: `https://api.pimlico.io/v2/${mantleSepoliaTestnet.id}/rpc?apikey=${process.env.PIMLICO_API_KEY}`,
  entryPointAddress: entryPoint07Address, // Using entry point v0.7
}; 