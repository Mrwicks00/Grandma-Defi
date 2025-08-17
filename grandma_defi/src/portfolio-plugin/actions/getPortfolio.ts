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

export const getPortfolioAction: Action = {
  name: "GET_PORTFOLIO",
  similes: [
    "GET_PORTFOLIO",
    "SHOW_PORTFOLIO",
    "VIEW_PORTFOLIO",
    "PORTFOLIO_STATUS",
    "MY_PORTFOLIO",
    "CHECK_PORTFOLIO",
    "PORTFOLIO_INFO",
  ],
  description:
    "Get detailed information about a specific portfolio or all user portfolios",

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
      logger.info("📊 Getting portfolio information");

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

      // Extract portfolio ID if specified
      let portfolioId = messageData?.portfolioId;
      if (!portfolioId) {
        const portfolioMatch = text.match(/portfolio\s*(\d+)/i);
        if (portfolioMatch) {
          portfolioId = parseInt(portfolioMatch[1]);
        }
      }

      const privateKey = await getWalletPrivateKey(runtime, walletId);

      // Helper function to format token symbol and get decimals
      const getTokenInfo = (address: string) => {
        const token = SUPPORTED_TOKENS.find(
          (t) => t.address.toLowerCase() === address.toLowerCase()
        );

        // Handle old USDT address for legacy portfolios
        if (
          address.toLowerCase() === "0x6db5d0288adcf2413afa84e06c158a5bdd85460f"
        ) {
          return { symbol: "USDT (Legacy)", decimals: 6 };
        }

        return token || { symbol: address.slice(0, 6) + "...", decimals: 18 };
      };

      // Helper function to format token amounts (convert from wei to human readable)
      const formatTokenAmount = (rawAmount: string, decimals: number) => {
        const amount = parseFloat(rawAmount) / Math.pow(10, decimals);
        if (amount === 0) return "0";
        if (amount < 0.0001) return "<0.0001";
        if (amount < 1) return amount.toFixed(6);
        if (amount < 1000) return amount.toFixed(4);
        return amount.toFixed(2);
      };

      // Helper function to format USD values
      const formatUSDValue = (value: string) => {
        const num = parseFloat(value);
        if (num === 0) return "0";
        if (num < 0.01) return "<0.01";

        // UPDATED: More reasonable safety check - only flag if extremely unrealistic (>$1M)
        // The contract should now provide more reasonable values
        if (num > 1000000) {
          return `${(num / 1000000).toFixed(1)}M (⚠️ Price feed issue)`;
        }

        // Normal formatting for realistic values
        if (num < 1000) return num.toFixed(2);
        if (num < 1000000) return (num / 1000).toFixed(1) + "K";
        return (num / 1000000).toFixed(1) + "M";
      };

      // Helper function to format percentage
      const formatPercentage = (basisPoints: string | number) => {
        const points =
          typeof basisPoints === "string" ? parseInt(basisPoints) : basisPoints;
        return (points / 100).toFixed(1) + "%";
      };

      if (portfolioId) {
        // Get specific portfolio
        const result = await service.getPortfolio(privateKey, portfolioId);

        if (!result.success) {
          throw new Error(result.error || "Failed to get portfolio");
        }

        const portfolio = result.data!;

        // Enhanced token display with beautiful formatting
        let portfolioDetails = "";
        let totalValueBreakdown = "";
        let totalCalculatedValue = 0;
        
        // Token emoji mapping for visual appeal
        const tokenEmojis: { [key: string]: string } = {
          "MNT": "🏛️",
          "wETH": "💎", 
          "wBTC": "🟡",
          "USDT18": "💸",
          "USDT (Legacy)": "💰",
          "GRANDMA": "👵"
        };

        for (let i = 0; i < portfolio.tokens.length; i++) {
          const tokenAddress = portfolio.tokens[i];
          const tokenInfo = getTokenInfo(tokenAddress);
          const targetAllocation = formatPercentage(portfolio.targetAllocations[i]);
          const balance = formatTokenAmount(portfolio.currentBalances[i], tokenInfo.decimals);
          const emoji = tokenEmojis[tokenInfo.symbol] || "🔸";
          
          // Calculate individual token USD value (rough estimate for display)
          const rawBalance = parseFloat(portfolio.currentBalances[i]) / Math.pow(10, tokenInfo.decimals);
          const totalPortfolioUSD = parseFloat(portfolio.totalValueUSD);
          const allocationPercent = parseInt(portfolio.targetAllocations[i]) / 10000;
          const tokenUSDValue = totalPortfolioUSD * allocationPercent;
          totalCalculatedValue += tokenUSDValue;

          portfolioDetails += `${emoji} **${tokenInfo.symbol}**: ${balance} ${tokenInfo.symbol}\n`;
          portfolioDetails += `   📊 Target: ${targetAllocation} | 💵 Value: ~$${tokenUSDValue.toFixed(2)}\n\n`;
        }

        // Create beautiful status badges
        const statusBadge = portfolio.active ? "🟢 **ACTIVE**" : "🔴 **INACTIVE**";
        const valueFormatted = formatUSDValue(portfolio.totalValueUSD);
        
        // Create progress bars for allocations (visual representation)
        let allocationBars = "";
        for (let i = 0; i < portfolio.tokens.length; i++) {
          const tokenInfo = getTokenInfo(portfolio.tokens[i]);
          const percent = parseInt(portfolio.targetAllocations[i]) / 100;
          const emoji = tokenEmojis[tokenInfo.symbol] || "🔸";
          const bars = "█".repeat(Math.round(percent / 5)); // Each █ = 5%
          const spaces = "░".repeat(20 - Math.round(percent / 5));
          allocationBars += `${emoji} ${tokenInfo.symbol}: ${bars}${spaces} ${percent}%\n`;
        }

        const responseContent: Content = {
          text:
            `╭─────────────────────────────────────╮\n` +
            `│           📊 PORTFOLIO #${portfolio.portfolioId}            │\n` +
            `╰─────────────────────────────────────╯\n\n` +
            
            `🔐 **Owner:** \`${portfolio.owner.slice(0, 6)}...${portfolio.owner.slice(-4)}\`\n` +
            `💰 **Total Value:** **$${valueFormatted} USD**\n` +
            `📈 **Status:** ${statusBadge}\n` +
            `🏦 **Smart Account:** \`${portfolio.smartAccountAddress.slice(0, 6)}...${portfolio.smartAccountAddress.slice(-4)}\`\n\n` +
            
            `╭─── 🎯 **CURRENT HOLDINGS** ───╮\n` +
            `${portfolioDetails}` +
            `╰─────────────────────────────────╯\n\n` +
            
            `╭─── 📊 **ALLOCATION BREAKDOWN** ───╮\n` +
            `${allocationBars}` +
            `╰─────────────────────────────────────╯\n\n` +
            
            `✨ **Portfolio Features:**\n` +
            `• 🤖 AI-powered rebalancing\n` +
            `• ⚡ Gasless transactions\n` +
            `• 🔄 Automatic market monitoring\n` +
            `• 📈 Real-time price tracking\n\n` +
            
            `💡 **Quick Actions:**\n` +
            `• \`rebalance portfolio ${portfolio.portfolioId}\` - Manual rebalance\n` +
            `• \`portfolio ${portfolio.portfolioId} details\` - Refresh data\n` +
            `• \`swap tokens portfolio ${portfolio.portfolioId}\` - Token swap\n\n` +
            
            `🌟 *Your AI portfolio manager is working 24/7 to optimize your investments!*`,
          source: message.content?.source || "user",
          data: portfolio,
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
        // Get all user portfolios
        const result = await service.getUserPortfolios(privateKey);

        if (!result.success) {
          throw new Error(result.error || "Failed to get user portfolios");
        }

        const userPortfolios = result.data!;

        if (userPortfolios.portfolioIds.length === 0) {
          const responseContent: Content = {
            text:
              `📊 **Your Portfolios**\n\n` +
              `🎯 You don't have any portfolios yet!\n\n` +
              `💡 **Get Started:**\n` +
              `• Say "create portfolio" to make your first portfolio\n` +
              `• Choose from balanced, conservative, or aggressive strategies\n` +
              `• Start with as little as 0.1 MNT`,
            source: message.content?.source || "user",
            data: userPortfolios,
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

        // Enhanced portfolio overview with beautiful display
        let portfolioList = "";
        let totalValue = 0;
        let activeCount = 0;
        
        for (let i = 0; i < userPortfolios.portfolioIds.length; i++) {
          const portfolioId = userPortfolios.portfolioIds[i];
          try {
            const portfolioResult = await service.getPortfolio(
              privateKey,
              Number(portfolioId)
            );
            if (portfolioResult.success) {
              const portfolio = portfolioResult.data!;
              const status = portfolio.active ? "🟢 **ACTIVE**" : "🔴 **INACTIVE**";
              const value = parseFloat(portfolio.totalValueUSD);
              totalValue += value;
              if (portfolio.active) activeCount++;
              
              // Get token count for quick overview
              const tokenCount = portfolio.tokens.length;
              const valueFormatted = formatUSDValue(portfolio.totalValueUSD);
              
              portfolioList += `╭─── 📊 **PORTFOLIO #${portfolio.portfolioId}** ───╮\n`;
              portfolioList += `│ 💰 Value: **$${valueFormatted} USD**\n`;
              portfolioList += `│ 📈 Status: ${status}\n`;
              portfolioList += `│ 🔸 Tokens: ${tokenCount} assets\n`;
              portfolioList += `│ 🎯 ID: ${portfolio.portfolioId}\n`;
              portfolioList += `╰─────────────────────────────╯\n\n`;
            }
          } catch (error) {
            portfolioList += `🚫 **Portfolio #${portfolioId}**: *Error loading data*\n\n`;
          }
        }

        const totalFormatted = formatUSDValue(totalValue.toString());
        const walletWorth = totalValue > 0 ? ` (Total Worth: **$${totalFormatted}**)` : "";

        const responseContent: Content = {
          text:
            `╭───────────────────────────────────────╮\n` +
            `│           🏦 YOUR PORTFOLIO HUB       │\n` +
            `╰───────────────────────────────────────╯\n\n` +
            
            `🔐 **Wallet Address:** \`${userPortfolios.userAddress.slice(0, 6)}...${userPortfolios.userAddress.slice(-4)}\`\n` +
            `📊 **Total Portfolios:** ${userPortfolios.portfolioIds.length} ${walletWorth}\n` +
            `🟢 **Active Portfolios:** ${activeCount}/${userPortfolios.portfolioIds.length}\n` +
            `🆔 **Portfolio IDs:** ${userPortfolios.portfolioIds.join(", ")}\n\n` +
            
            `╭─── 📋 **PORTFOLIO OVERVIEW** ───╮\n` +
            `${portfolioList}` +
            `╰─────────────────────────────────╯\n\n` +
            
            `🚀 **Quick Actions:**\n` +
            `• \`get portfolio [ID] from wallet ${walletId?.split("-")[1]}\` - View details\n` +
            `• \`create portfolio with [amount] MNT\` - New portfolio\n` +
            `• \`rebalance portfolio [ID]\` - Manual rebalance\n\n` +
            
            `✨ **Portfolio Stats:**\n` +
            `• 🤖 AI manages ${activeCount} active portfolio${activeCount !== 1 ? 's' : ''}\n` +
            `• ⚡ All transactions are gasless\n` +
            `• 📈 Real-time market monitoring active\n` +
            `• 🔄 Auto-rebalancing when needed\n\n` +
            
            `🌟 *Your AI-powered DeFi portfolio management system is operational!*`,
          source: message.content?.source || "user",
          data: userPortfolios,
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
      logger.error("Error in getPortfolioAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorContent: Content = {
        text: `❌ **Failed to Get Portfolio**\n\nError: ${errorMessage}\n\n💡 Make sure you have:\n• A valid wallet\n• Created at least one portfolio\n• Proper network connection`,
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
