import type { Plugin } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { z } from "zod";
import {
  createPortfolioAction,
  getPortfolioAction,
  swapTokenAction,
  createMultiTokenPortfolioAction,
} from "./actions";
import { PortfolioService } from "./service";

const configSchema = z.object({
  PIMLICO_API_KEY: z
    .string()
    .min(1, "Pimlico API key is required for portfolio management"),
});

const plugin: Plugin = {
  name: "portfolio_manager",
  description:
    "AI-powered DeFi portfolio manager with automated rebalancing and smart contract integration on Mantle network",

  config: {
    PIMLICO_API_KEY: process.env.PIMLICO_API_KEY,
  },

  async init(config: Record<string, any>): Promise<void> {
    logger.info("🎯 Initializing Portfolio Manager plugin");

    try {
      const validatedConfig = await configSchema.parseAsync(config);

      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value !== undefined) {
          process.env[key] = String(value);
        }
      }

      logger.info("✅ Portfolio Manager plugin initialized successfully");
    } catch (error) {
      logger.error("❌ Portfolio Manager plugin initialization failed:", error);
      throw error;
    }
  },

  models: {
    [ModelType.TEXT_SMALL]: async (): Promise<string> =>
      "🎯 Portfolio created successfully!",
    [ModelType.TEXT_LARGE]: async (): Promise<string> =>
      "🎯 Your AI-powered portfolio has been created and is ready for automated management on the Mantle network!",
    [ModelType.TEXT_EMBEDDING]: async (params: any): Promise<number[]> => {
      const text = params?.text || params?.input || "";

      // Generate portfolio-focused embedding (512 dimensions)
      const embedding = new Array(512);
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff;
      }

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
        logger.debug("MESSAGE_RECEIVED in Portfolio Manager plugin");
      },
    ],
  },

  services: [PortfolioService],
  actions: [
    createPortfolioAction,
    getPortfolioAction,
    swapTokenAction,
    createMultiTokenPortfolioAction,
  ],
  providers: [],
};

export default plugin;
