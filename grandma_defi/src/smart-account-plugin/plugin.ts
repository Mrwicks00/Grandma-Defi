// src/smart-account-plugin/plugin.ts

import type { Plugin } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { z } from "zod";
import {
  createWalletAction,
  importWalletAction,
  getBalanceAction,
  sendTransactionAction,
  getWalletInfoAction,
  batchTransactionsAction,
  getWalletCountAction,
  getTokenBalanceAction,
} from "./action";
import { PimlicoWalletService } from "./service";

const configSchema = z.object({
  PIMLICO_API_KEY: z.string().min(1, "Pimlico API key is not provided"),
});

const plugin: Plugin = {
  name: "pimlico_para_mantle_wallet",
  description:
    "Creates Pimlico ERC-4337 smart wallets using Para on Mantle network",
  config: {
    PIMLICO_API_KEY: process.env.PIMLICO_API_KEY,
  },

  async init(config: Record<string, string>): Promise<void> {
    logger.info(" Initializing Pimlico/Para Mantle wallet plugin ");

    try {
      const validatedConfig = await configSchema.parseAsync(config);

      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value !== undefined) {
          process.env[key] = String(value);
        }
      }

      logger.info(
        " Pimlico/Para plugin initialized successfully on Mantle Sepolia Testnet "
      );
    } catch (error) {
      logger.error("Plugin initialization failed:", error);
      throw error;
    }
  },

  models: {
    [ModelType.TEXT_SMALL]: async (): Promise<string> =>
      "👵 A new wallet is made, sweetie!",
    [ModelType.TEXT_LARGE]: async (): Promise<string> =>
      "👵 A new Pimlico/Para ERC-4337 smart wallet has been created on the Mantle network, just for you!",
    [ModelType.TEXT_EMBEDDING]: async (params: any): Promise<number[]> => {
      // Return a dummy embedding vector for wallet-related content
      // In a real implementation, you might want to use an actual embedding service
      const text = params?.text || params?.input || "";

      // Generate a simple hash-based embedding (512 dimensions)
      const embedding = new Array(512);
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff;
      }

      // Fill the embedding array with normalized values based on the hash
      for (let i = 0; i < 512; i++) {
        embedding[i] = Math.sin((hash * (i + 1)) / 1000) * 0.1;
      }

      return embedding;
    },
  },

  routes: [],

  events: {
    MESSAGE_RECEIVED: [
      async (params): Promise<void> => {
        logger.debug("MESSAGE_RECEIVED in Pimlico plugin");
      },
    ],
  },

  services: [PimlicoWalletService],
  actions: [
    createWalletAction,
    importWalletAction,
    getBalanceAction,
    sendTransactionAction,
    getWalletInfoAction,
    batchTransactionsAction,
    getWalletCountAction,
    getTokenBalanceAction,
  ],
  providers: [],
};

export default plugin; 
