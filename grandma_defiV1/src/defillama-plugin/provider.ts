import { logger } from "@elizaos/core";

export interface YieldPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  apy: number;
  tvlUsd: number;
  url: string;
  rewardTokens: string[];
}

export interface Protocol {
  name: string;
  chain: string;
  tvl: number;
  category: string;
}

export interface ChainTVL {
  name: string;
  tvl: number;
}

/**
 * Fetches yield-bearing pools from DeFiLlama and filters by a specific chain.
 * @param chainName The name of the blockchain to filter by (e.g., 'Mantle').
 * @returns A promise that resolves to an array of YieldPool objects.
 */
export async function getYieldPoolsByChain(
  chainName: string
): Promise<YieldPool[]> {
  try {
    logger.info(`Fetching yield pools from DeFiLlama for chain: ${chainName}`);

    const url = "https://yields.llama.fi/pools";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch data from DeFiLlama: ${response.statusText}`
      );
    }

    const data = (await response.json()) as any;
    const allPools: any[] = (data.data as any[]) || [];

    // Filter pools by the specified chain and sort by APY descending
    const filteredPools = allPools
      .filter(
        (p) => p.chain?.toLowerCase() === chainName.toLowerCase() && p.apy
      )
      .map((p) => ({
        pool: p.pool,
        chain: p.chain,
        project: p.project,
        symbol: p.symbol,
        apy: p.apy,
        tvlUsd: p.tvlUsd,
        url: p.url,
        rewardTokens: p.rewardTokens || [],
      }))
      .sort((a, b) => b.apy - a.apy); // Sort by APY descending

    logger.info(`Found ${filteredPools.length} yield pools for ${chainName}`);

    return filteredPools;
  } catch (error) {
    logger.error("Error fetching DeFiLlama yield data:", error);
    throw new Error(`Failed to get yield protocols: ${error.message}`);
  }
}

/**
 * Fetches and aggregates TVL for all chains.
 * @returns A promise that resolves to an array of ChainTVL objects.
 */
export async function getChainsTVL(): Promise<ChainTVL[]> {
  try {
    logger.info(`Fetching TVL for all chains from DeFiLlama`);

    const url = "https://api.llama.fi/chains";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch data from DeFiLlama: ${response.statusText}`
      );
    }

    const data: any[] = (await response.json()) as any[];

    const chainsTVL = data
      .map((c) => ({
        name: c.name,
        tvl: c.tvl,
      }))
      .sort((a, b) => b.tvl - a.tvl);

    logger.info(`Found TVL data for ${chainsTVL.length} chains.`);

    return chainsTVL;
  } catch (error) {
    logger.error("Error fetching DeFiLlama chains TVL:", error);
    throw new Error(`Failed to get chains TVL: ${error.message}`);
  }
}

/**
 * Fetches all protocols for a given chain.
 * @param chainName The name of the blockchain to filter by (e.g., 'Mantle').
 * @returns A promise that resolves to an array of Protocol objects.
 */
export async function getProtocolsByChain(
  chainName: string
): Promise<Protocol[]> {
  try {
    logger.info(`Fetching protocols from DeFiLlama for chain: ${chainName}`);

    const url = `https://api.llama.fi/protocols`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch data from DeFiLlama: ${response.statusText}`
      );
    }

    const allProtocols: any[] = (await response.json()) as any[];

    const filteredProtocols = allProtocols
      .filter((p) => p.chain?.toLowerCase() === chainName.toLowerCase())
      .map((p) => ({
        name: p.name,
        chain: p.chain,
        tvl: p.tvl,
        category: p.category,
      }))
      .sort((a, b) => b.tvl - a.tvl);

    logger.info(`Found ${filteredProtocols.length} protocols for ${chainName}`);

    return filteredProtocols;
  } catch (error) {
    logger.error("Error fetching DeFiLlama data:", error);
    throw new Error(`Failed to get DeFi protocols: ${error.message}`);
  }
}
