import {
    type IAgentRuntime,
    logger,
    Service,
  } from '@elizaos/core';
  
  import {
    getProtocolsByChain,
    getYieldPoolsByChain,
    getChainsTVL,
    type YieldPool,
    type Protocol,
    type ChainTVL
  } from './provider';
  
  export class DeFiLlamaService extends Service {
    static serviceType = 'defillama_mantle';
  
    capabilityDescription = 'This plugin fetches various DeFi protocol data from DeFiLlama for the Mantle network, including yield, TVL, and protocol information.';
  
    constructor(runtime: IAgentRuntime) {
      super(runtime);
    }
  
    static async start(runtime: IAgentRuntime): Promise<DeFiLlamaService> {
      logger.info('*** Starting DeFiLlama service for Mantle ***');
      return new DeFiLlamaService(runtime);
    }
  
    static async stop(runtime: IAgentRuntime): Promise<void> {
      const service = runtime.getService(DeFiLlamaService.serviceType);
      if (!service) {
        throw new Error('DeFiLlama service not found');
      }
      await service.stop();
    }
  
    async stop(): Promise<void> {
      logger.info('*** Stopping DeFiLlama service instance ***');
    }
  
    async validateConfiguration(): Promise<boolean> {
      try {
        await getProtocolsByChain('Mantle');
        await getYieldPoolsByChain('Mantle');
        return true;
      } catch (error) {
        logger.error('DeFiLlama configuration validation failed:', error);
        return false;
      }
    }
  
    async getYieldPools(): Promise<{ success: boolean; data?: YieldPool[]; error?: string }> {
      try {
        logger.info('Getting yield protocols for Mantle network');
        const pools = await getYieldPoolsByChain('Mantle');
        return {
          success: true,
          data: pools,
        };
      } catch (error) {
        logger.error('Error getting yield pools:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  
    async getProtocols(): Promise<{ success: boolean; data?: Protocol[]; error?: string }> {
      try {
        logger.info('Getting all protocols for Mantle network');
        const protocols = await getProtocolsByChain('Mantle');
        return {
          success: true,
          data: protocols,
        };
      } catch (error) {
        logger.error('Error getting protocols:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  
    async getChainsTVL(): Promise<{ success: boolean; data?: ChainTVL[]; error?: string }> {
      try {
        logger.info('Getting all chains TVL');
        const chains = await getChainsTVL();
        return {
          success: true,
          data: chains,
        };
      } catch (error) {
        logger.error('Error getting chains TVL:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  }
  