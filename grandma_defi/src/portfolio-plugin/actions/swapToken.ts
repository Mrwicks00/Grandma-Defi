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
import { SUPPORTED_TOKENS } from "../config/addresses";

// Helper function to get wallet private key by ID (unified system for both smart accounts and EOA)
async function getWalletPrivateKey(
  runtime: IAgentRuntime,
  walletId?: string
): Promise<string> {
  if (!walletId) {
    throw new Error(
      "Please specify which wallet to use (e.g., 'from wallet 1' or 'from wallet 2')"
    );
  }

  const smartAccountService = runtime.getService("pimlico_wallet") as any;
  if (!smartAccountService) {
    throw new Error("Wallet service not available");
  }

  // Use unified wallet lookup - now both smart accounts and EOAs use the same wallet-X format
  try {
    const walletResult = await smartAccountService.getWalletById(walletId);
    if (walletResult.success && walletResult.data) {
      return walletResult.data.privateKey;
    }
  } catch (error) {
    // Wallet not found
  }

  throw new Error(
    `Wallet ${walletId} not found. Available options:\n` +
    `• Create smart account: "create wallet"\n` +
    `• Import EOA: "import EOA wallet with private key 0x..."\n` +
    `• List wallets: "show my wallets"`
  );
}

export const swapTokenAction: Action = {
  name: "SWAP_TOKEN",
  similes: [
    "SWAP_TOKEN",
    "SWAP",
    "EXCHANGE",
    "TRADE",
    "REBALANCE",
    "REBALANCE_PORTFOLIO",
  ],
  description:
    "Swap tokens within a portfolio or trigger portfolio rebalancing",

  validate: async (
    _runtime: IAgentRuntime,
    _message: Memory
  ): Promise<boolean> => {
    return true;
  },

  handler: async function (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      logger.info("🔄 Processing swap/rebalance request");

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

      // Extract portfolio ID
      let portfolioId = messageData?.portfolioId;
      if (!portfolioId) {
        const portfolioMatch = text.match(/portfolio\s*(\d+)/i);
        if (portfolioMatch) {
          portfolioId = parseInt(portfolioMatch[1]);
        } else {
          throw new Error(
            "Please specify which portfolio to rebalance (e.g., 'rebalance portfolio 1')"
          );
        }
      }

      const privateKey = await getWalletPrivateKey(runtime, walletId);

      // Helper function to format token symbol
      const getTokenSymbol = (address: string) => {
        const token = SUPPORTED_TOKENS.find(
          (t) => t.address.toLowerCase() === address.toLowerCase()
        );
        return token ? token.symbol : address.slice(0, 6) + "...";
      };

      // Check if this is a specific swap request or general rebalance
      const isSpecificSwap =
        text.includes("swap") && (text.includes("to") || text.includes("for"));

      if (isSpecificSwap) {
        // Extract swap details
        let fromToken = "";
        let toToken = "";
        let amount = "0";

        // Try to extract token symbols
        const swapMatch = text.match(
          /swap\s+(\d+(?:\.\d+)?)\s*(\w+)\s+(?:to|for)\s+(\w+)/i
        );
        if (swapMatch) {
          amount = swapMatch[1];
          const fromSymbol = swapMatch[2];
          const toSymbol = swapMatch[3];

          // Find token addresses with case-insensitive matching
          const fromTokenData = SUPPORTED_TOKENS.find(
            (t) => t.symbol.toLowerCase() === fromSymbol.toLowerCase()
          );
          const toTokenData = SUPPORTED_TOKENS.find(
            (t) => t.symbol.toLowerCase() === toSymbol.toLowerCase()
          );

          if (!fromTokenData || !toTokenData) {
            throw new Error(
              `Unsupported token. Supported tokens: ${SUPPORTED_TOKENS.map((t) => t.symbol).join(", ")}`
            );
          }

          fromToken = fromTokenData.address;
          toToken = toTokenData.address;
        } else {
          throw new Error(
            "Please specify the swap in format: 'swap X TOKEN1 to TOKEN2' (e.g., 'swap 10 MNT to WETH')"
          );
        }

        const result = await service.swapToken(
          privateKey,
          portfolioId,
          fromToken,
          toToken,
          amount
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to perform swap");
        }

        const fromSymbol = getTokenSymbol(fromToken);
        const toSymbol = getTokenSymbol(toToken);

        const responseContent: Content = {
          text:
            `🔄 **Swap Initiated Successfully!**\n\n` +
            `📊 **Portfolio:** #${portfolioId}\n` +
            `💱 **Swap Details:** ${amount} ${fromSymbol} → ${toSymbol}\n\n` +
            `⚡ **Process:**\n` +
            `• Portfolio rebalancing triggered\n` +
            `• Smart contract will optimize the swap\n` +
            `• Your target allocations will be maintained\n\n` +
            `🧾 **Transaction Hash:** ${result.data?.transactionHash}\n` +
            `🔗 **Explorer:** ${result.data?.explorerUrl}\n\n` +
            `✅ Your portfolio is being rebalanced to accommodate the swap!`,
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
      } else {
        // General portfolio rebalancing
        const result = await service.rebalancePortfolio(
          privateKey,
          portfolioId
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to rebalance portfolio");
        }

        const responseContent: Content = {
          text:
            `⚖️ **Portfolio Rebalancing Initiated!**\n\n` +
            `📊 **Portfolio:** #${portfolioId}\n\n` +
            `🎯 **Rebalancing Process:**\n` +
            `• Analyzing current vs target allocations\n` +
            `• Optimizing token distributions\n` +
            `• Executing necessary swaps\n` +
            `• Maintaining your investment strategy\n\n` +
            `🧾 **Transaction Hash:** ${result.data?.transactionHash}\n` +
            `🔗 **Explorer:** ${result.data?.explorerUrl}\n\n` +
            `✅ Your portfolio will be automatically rebalanced to match target allocations!\n\n` +
            `💡 **Tip:** Check your portfolio status with "get portfolio ${portfolioId}" in a few minutes`,
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
      }
    } catch (error) {
      logger.error("Error in swapTokenAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorContent: Content = {
        text:
          `❌ **Swap/Rebalance Failed**\n\n` +
          `Error: ${errorMessage}\n\n` +
          `💡 **Make sure you have:**\n` +
          `• A valid wallet and portfolio\n` +
          `• Sufficient token balances\n` +
          `• Proper network connection\n\n` +
          `🔧 **Examples:**\n` +
          `• "rebalance portfolio 1"\n` +
          `• "swap 10 MNT to WETH in portfolio 1"`,
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
