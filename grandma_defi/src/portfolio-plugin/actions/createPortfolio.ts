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
import { PortfolioService } from "../service";
import { SUPPORTED_TOKENS, ADDRESSES } from "../config/addresses";

// Helper function to get wallet private key by ID
async function getWalletPrivateKey(
  runtime: IAgentRuntime,
  walletId?: string
): Promise<string> {
  if (!walletId) {
    throw new Error(
      "Please specify which wallet to use (e.g., 'from wallet 1')"
    );
  }

  // Try to get the wallet from smart account service
  const smartAccountService = runtime.getService("pimlico_wallet") as any;
  if (!smartAccountService) {
    throw new Error("Smart account service not available");
  }

  const walletResult = await smartAccountService.getWalletById(walletId);
  if (!walletResult.success || !walletResult.data) {
    throw new Error(
      `Wallet ${walletId} not found. Please create a wallet first.`
    );
  }

  return walletResult.data.privateKey;
}

export const createPortfolioAction: Action = {
  name: "CREATE_PORTFOLIO",
  similes: [
    "CREATE_PORTFOLIO",
    "NEW_PORTFOLIO",
    "MAKE_PORTFOLIO",
    "BUILD_PORTFOLIO",
    "START_PORTFOLIO",
    "SETUP_PORTFOLIO",
  ],
  description:
    "Create a new AI-managed DeFi portfolio with automatic rebalancing",

  validate: async (
    _runtime: IAgentRuntime,
    _message: Memory
  ): Promise<boolean> => {
    return true; // We'll handle validation in the handler
  },

  handler: async function (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      logger.info("🎯 Creating new portfolio");

      const service = runtime.getService(
        PortfolioService.serviceType
      ) as PortfolioService;
      if (!service) {
        throw new Error("Portfolio service not found");
      }

      const text = message.content?.text?.toLowerCase() || "";
      const messageData = message.content?.data as any;

      // Extract wallet number
      let walletId = messageData?.walletId;
      if (!walletId) {
        const walletMatch = text.match(/(?:from\s+|using\s+)?wallet\s*(\d+)/i);
        if (walletMatch) {
          walletId = `wallet-${walletMatch[1]}`;
        }
      }

      // Extract initial investment amount
      let initialValue = messageData?.amount || "0.1";
      const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:MNT|mnt|ETH|eth)?/);
      if (amountMatch) {
        initialValue = amountMatch[1];
      }

      // Extract portfolio strategy from text
      let strategy = "balanced";
      if (text.includes("conservative") || text.includes("safe")) {
        strategy = "conservative";
      } else if (text.includes("aggressive") || text.includes("risky")) {
        strategy = "aggressive";
      } else if (text.includes("defi") || text.includes("yield")) {
        strategy = "defi";
      }

      // Get wallet private key
      const privateKey = await getWalletPrivateKey(runtime, walletId);

      // Define portfolio strategies
      let tokens: string[];
      let allocations: number[];

      switch (strategy) {
        case "conservative":
          tokens = [
            "0x0000000000000000000000000000000000000000", // MNT
            ADDRESSES.USDT, // USDT
            ADDRESSES.wETH, // wETH
          ];
          allocations = [5000, 3000, 2000]; // 50% MNT, 30% USDT, 20% wETH
          break;

        case "aggressive":
          tokens = [
            "0x0000000000000000000000000000000000000000", // MNT
            ADDRESSES.wETH, // wETH
            ADDRESSES.wBTC, // wBTC
            ADDRESSES.GRANDMA, // GRANDMA
          ];
          allocations = [3000, 3000, 2500, 1500]; // 30% MNT, 30% wETH, 25% wBTC, 15% GRANDMA
          break;

        case "defi":
          tokens = [
            "0x0000000000000000000000000000000000000000", // MNT
            ADDRESSES.wETH, // wETH
            ADDRESSES.GRANDMA, // GRANDMA
          ];
          allocations = [4000, 3000, 3000]; // 40% MNT, 30% wETH, 30% GRANDMA
          break;

        default: // balanced
          tokens = [
            "0x0000000000000000000000000000000000000000", // MNT
            ADDRESSES.wETH, // wETH
            ADDRESSES.USDT, // USDT
          ];
          allocations = [4000, 4000, 2000]; // 40% MNT, 40% wETH, 20% USDT
          break;
      }

      const rebalanceThreshold = 500; // 5% threshold

      const result = await service.createPortfolio(
        privateKey,
        tokens,
        allocations,
        rebalanceThreshold,
        initialValue
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to create portfolio");
      }

      // Map token addresses to symbols for display
      const getTokenSymbol = (address: string) => {
        const token = SUPPORTED_TOKENS.find(
          (t) => t.address.toLowerCase() === address.toLowerCase()
        );
        return token ? token.symbol : address.slice(0, 6) + "...";
      };

      const allocationText = tokens
        .map((token, i) => {
          const symbol = getTokenSymbol(token);
          const percentage = (allocations[i] / 100).toFixed(1);
          return `• ${percentage}% ${symbol}`;
        })
        .join("\n");

      // Create enhanced allocation display with emojis
      const tokenEmojis: { [key: string]: string } = {
        MNT: "🏛️",
        wETH: "💎",
        wBTC: "🟡",
        USDT18: "💸",
        GRANDMA: "👵",
      };

      const enhancedAllocationText = tokens
        .map((token, i) => {
          const symbol = getTokenSymbol(token);
          const percentage = (allocations[i] / 100).toFixed(1);
          const percentageNum = allocations[i] / 100; // Keep as number for calculations
          const emoji = tokenEmojis[symbol] || "🔸";
          const bars = "█".repeat(Math.round(percentageNum / 5)); // Visual bar
          const spaces = "░".repeat(20 - Math.round(percentageNum / 5));
          return `${emoji} **${symbol}**: ${bars}${spaces} ${percentage}%`;
        })
        .join("\n");

      const responseContent: Content = {
        text:
          `╭─────────────────────────────────────╮\n` +
          `│         🎉 PORTFOLIO CREATED!       │\n` +
          `╰─────────────────────────────────────╯\n\n` +
          `🚀 **${strategy.charAt(0).toUpperCase() + strategy.slice(1)} Portfolio Successfully Deployed!**\n\n` +
          `💰 **Investment Details:**\n` +
          `• Initial Value: **${initialValue} MNT**\n` +
          `• Strategy: **${strategy.charAt(0).toUpperCase() + strategy.slice(1)}**\n` +
          `• Auto-Rebalance: **5% threshold**\n\n` +
          `╭─── 📊 **ALLOCATION STRATEGY** ───╮\n` +
          `${enhancedAllocationText}\n` +
          `╰─────────────────────────────────╯\n\n` +
          `✨ **AI Features Activated:**\n` +
          `• 🤖 **Smart Rebalancing** - Maintains target allocation\n` +
          `• ⚡ **Gasless Transactions** - No gas fees for you\n` +
          `• 📈 **Market Monitoring** - 24/7 price tracking\n` +
          `• 🔄 **Auto-Optimization** - AI adjusts for best performance\n\n` +
          `📋 **Transaction Details:**\n` +
          `• Hash: \`${result.data?.transactionHash?.slice(0, 10)}...${result.data?.transactionHash?.slice(-6)}\`\n` +
          `• Network: Mantle Sepolia Testnet\n` +
          `• Status: ✅ **Confirmed**\n\n` +
          `🔗 **[View on Explorer](${result.data?.explorerUrl})**\n\n` +
          `🎯 **Next Steps:**\n` +
          `• Use \`get my portfolios from wallet ${walletId?.split("-")[1]}\` to find your Portfolio ID\n` +
          `• Monitor performance with \`get portfolio [ID]\`\n` +
          `• Manual rebalance anytime with \`rebalance portfolio [ID]\`\n\n` +
          `🌟 **Your AI portfolio manager is now working 24/7 to optimize your investments!**\n` +
          `⏰ *Transaction will confirm in 30-60 seconds*`,
        source: message.content?.source || "user",
        data: result.data,
      };

      if (callback) {
        await callback(responseContent);
      }

      return createActionResult({
        text: responseContent.text,
        data: responseContent.data as Record<string, any>,
        success: true,
      });
    } catch (error) {
      logger.error("Error in createPortfolioAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorContent: Content = {
        text: `❌ **Portfolio Creation Failed**\n\nError: ${errorMessage}\n\n💡 Make sure you have:\n• A valid wallet\n• Sufficient MNT balance\n• Proper network connection`,
        source: message.content?.source || "user",
      };

      if (callback) {
        await callback(errorContent);
      }

      return createActionResult({
        text: errorContent.text,
        success: false,
        error: errorMessage,
      });
    }
  },
};
