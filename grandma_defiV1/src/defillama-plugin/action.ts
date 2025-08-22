import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  type ActionResult,
  createActionResult,
  logger,
} from "@elizaos/core";
import { DeFiLlamaService } from "./service";

/**
 * Helper function to format large numbers with commas.
 * @param num The number to format.
 * @returns A formatted string.
 */
function formatNumber(num: number): string {
  if (num === null || num === undefined || isNaN(num)) {
    return "N/A";
  }
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Action to fetch and display various DeFi information for the Mantle network.
 * This action uses a single handler to route different types of requests.
 */
export const getDeFiInfoAction: Action = {
  name: "GET_DEFI_INFO",
  similes: [
    "DEFI_INFO",
    "DEFI_PROTOCOLS",
    "YIELD_PROTOCOLS",
    "TVL_INFO",
    "GET_PROTOCOLS",
    "YIELD_INFO",
    "TOP_CHAINS",
  ],
  description:
    "Fetches and displays various DeFi information (yield, TVL, protocols) from DeFiLlama.",
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase();
    return !!(
      text?.includes("yield") ||
      text?.includes("tvl") ||
      text?.includes("protocols") ||
      text?.includes("chains")
    );
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const text = message.content?.text?.toLowerCase();
      const service = runtime.getService(
        DeFiLlamaService.serviceType
      ) as DeFiLlamaService;
      if (!service) {
        throw new Error("DeFiLlama service not found");
      }

      let responseContent: Content;
      let data: any;

      if (text?.includes("yield") || text?.includes("apy")) {
        logger.info("Fetching DeFi yield pools for Mantle");
        const result = await service.getYieldPools();
        if (!result.success) throw new Error(result.error);
        const pools = result.data?.slice(0, 5);
        if (!pools || pools.length === 0) {
          responseContent = {
            text: `🔍 I couldn't find any yield protocols on the Mantle network right now.`,
          };
        } else {
          const poolListText = pools
            .map(
              (p, index) =>
                `${index + 1}. **${p.project}**\n` +
                `   - **Asset:** ${p.symbol}\n` +
                `   - **APY:** ${p.apy.toFixed(2)}%\n` +
                `   - **TVL:** $${formatNumber(p.tvlUsd)}\n` +
                `   - **More Info:** [${p.url}](${p.url})`
            )
            .join("\n\n");
          responseContent = {
            text: `📊 Here are some of the top yield-earning opportunities on the Mantle network:\n\n${poolListText}\n\nRemember to always do your own research before investing! If your grandma can do it, anyone can do it!`,
            source: message.content?.source,
            data: { pools },
          };
        }
      } else if (text?.includes("tvl") || text?.includes("chains")) {
        logger.info("Fetching top chains by TVL");
        const result = await service.getChainsTVL();
        if (!result.success) throw new Error(result.error);
        const chains = result.data?.slice(0, 5);
        if (!chains || chains.length === 0) {
          responseContent = {
            text: `🔍 I couldn't find any chains with TVL data right now.`,
          };
        } else {
          const chainListText = chains
            .map(
              (c, index) =>
                `${index + 1}. **${c.name}**\n` +
                `   - **TVL:** $${formatNumber(c.tvl)}`
            )
            .join("\n\n");
          responseContent = {
            text: `📈 Here are the top chains by Total Value Locked (TVL):\n\n${chainListText}\n\nTVL is a great way to measure how popular a chain is. If your grandma can do it, anyone can do it!`,
            source: message.content?.source,
            data: { chains },
          };
        }
      } else {
        logger.info("Fetching all protocols for Mantle");
        const result = await service.getProtocols();
        if (!result.success) throw new Error(result.error);
        const protocols = result.data?.slice(0, 5);
        if (!protocols || protocols.length === 0) {
          responseContent = {
            text: `🔍 I couldn't find any DeFi protocols on the Mantle network right now.`,
          };
        } else {
          const protocolListText = protocols
            .map(
              (p, index) =>
                `${index + 1}. **${p.name}**\n` +
                `   - **Category:** ${p.category || "N/A"}\n` +
                `   - **TVL:** $${formatNumber(p.tvl)}`
            )
            .join("\n\n");
          responseContent = {
            text: `📊 Here are some of the top DeFi protocols on the Mantle network:\n\n${protocolListText}\n\nTVL stands for "Total Value Locked" - it's the total value of assets held by a protocol. If your grandma can do it, anyone can do it!`,
            source: message.content?.source,
            data: { protocols },
          };
        }
      }

      if (callback) {
        await callback(responseContent);
      }

      return createActionResult({
        text: responseContent.text,
        data: responseContent.data as Record<string, any>,
        success: true,
      });
    } catch (error) {
      logger.error("Error in getDeFiInfoAction:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (callback) {
        await callback({
          text: `❌ Sorry, something went wrong while fetching the DeFi information: ${errorMessage}`,
          source: message.content?.source,
          data: { error: errorMessage },
        });
      }
      return createActionResult({
        text: `❌ Sorry, I couldn't get the DeFi information you requested. Let's try again in a bit.`,
        success: false,
        error: errorMessage,
      });
    }
  },
  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "What are the top DeFi protocols on Mantle?" },
      },
      {
        name: "Eliza",
        content: {
          text: '📊 Here are some of the top DeFi protocols on the Mantle network:\n\n1. **Protocol A**\n   - **Category:** Lending\n   - **TVL:** $1,000,000.00\n\nTVL stands for "Total Value Locked" - it\'s the total value of assets held by a protocol. If your grandma can do it, anyone can do it!',
          actions: ["GET_PROTOCOLS_SUCCESS"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: { text: "Show me some yield protocols with high APY" },
      },
      {
        name: "Eliza",
        content: {
          text: "📊 Here are some of the top yield-earning opportunities on the Mantle network:\n\n1. **Protocol B**\n   - **Asset:** MNT\n   - **APY:** 50.12%\n   - **TVL:** $500,000.00\n   - **More Info:** [https://example.com/pool](https://example.com/pool)\n\nRemember to always do your own research before investing! If your grandma can do it, anyone can do it!",
          actions: ["GET_YIELD_PROTOCOLS_SUCCESS"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: { text: "Which chains have the highest TVL?" },
      },
      {
        name: "Eliza",
        content: {
          text: "📈 Here are the top chains by Total Value Locked (TVL):\n\n1. **Ethereum**\n   - **TVL:** $100,000,000,000.00\n\nTVL is a great way to measure how popular a chain is. If your grandma can do it, anyone can do it!",
          actions: ["GET_CHAINS_TVL_SUCCESS"],
        },
      },
    ],
  ],
};
