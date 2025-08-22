import {
  type Plugin,
  type IAgentRuntime,
  logger,
  ModelType,
} from "@elizaos/core";
import { BridgeService } from "./service";
import {
  bridgeMntToEthAction,
  bridgeMntFromEthAction,
  checkBridgeStatusAction,
  getBridgeBalancesAction,
} from "./action";

export const bridgePlugin: Plugin = {
  name: "bridge-plugin",
  description:
    "Bridge MNT tokens between Mantle and Ethereum networks using Mantle SDK",

  models: {
    [ModelType.TEXT_SMALL]: async (runtime: IAgentRuntime) => {
      return {
        provider: "openai",
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        maxTokens: 1000,
      };
    },
  },

  services: [BridgeService],

  actions: [
    bridgeMntToEthAction,
    bridgeMntFromEthAction,
    checkBridgeStatusAction,
    getBridgeBalancesAction,
  ],

  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    try {
      logger.info("Bridge plugin initialized successfully");
      logger.info(
        "Supported operations: MNT bridging between Mantle and Ethereum"
      );
    } catch (error) {
      logger.error("Bridge plugin initialization failed:", error);
      throw error;
    }
  },
};

export default bridgePlugin;
