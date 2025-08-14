// src/defillama-plugin/plugin.ts

import type { Plugin } from '@elizaos/core';
import {
  logger,
} from '@elizaos/core';
import { z } from 'zod';
import {
  getDeFiInfoAction,
} from './action';
import { DeFiLlamaService } from './service';

// No configuration needed for this public API
const configSchema = z.object({});

const plugin: Plugin = {
  name: 'defillama_mantle_plugin',
  description: 'Fetches various DeFi data (yields, TVL, protocols) from DeFiLlama for the Mantle network and other chains.',
  config: {},

  async init(config: Record<string, string>): Promise<void> {
    logger.info(' Initializing DeFiLlama Mantle plugin ');

    try {
      await configSchema.parseAsync(config);
      logger.info(' DeFiLlama plugin initialized successfully ');
    } catch (error) {
      logger.error('Plugin initialization failed:', error);
      throw error;
    }
  },

  models: {
    'TEXT_SMALL': async (): Promise<string> => 'I found some DeFi information for you.',
    'TEXT_LARGE': async (): Promise<string> => 'I have a list of top DeFi protocols, yield opportunities, or chains, all thanks to DeFiLlama!',
  },

  routes: [],
  events: {},
  services: [DeFiLlamaService],
  actions: [getDeFiInfoAction],
  providers: [],
};

export default plugin;
