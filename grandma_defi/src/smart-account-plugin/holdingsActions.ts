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
import { PimlicoWalletService } from "./service";

interface HoldingsData {
  walletId?: string;
  address?: string;
}

// Enhanced Holdings Display Action (Orby-powered)
export const showHoldingsAction: Action = {
  name: "SHOW_HOLDINGS",
  similes: [
    "SHOW_HOLDINGS",
    "CHECK_HOLDINGS",
    "MY_HOLDINGS",
    "WALLET_HOLDINGS",
    "TOKEN_HOLDINGS",
    "HOLDINGS_BALANCE",
    "CROSS_CHAIN_HOLDINGS",
  ],
  description:
    "Show comprehensive token holdings across all chains with Orby analysis",
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return (
      text.includes("holdings") ||
      (text.includes("show") && text.includes("tokens")) ||
      (text.includes("what") && text.includes("tokens")) ||
      text.includes("token balance")
    );
  },
  handler: async function (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      logger.info("Showing enhanced holdings with Orby analysis");

      const service = runtime.getService(
        PimlicoWalletService.serviceType
      ) as PimlicoWalletService;
      if (!service) {
        throw new Error("Wallet service not found");
      }

      const messageData = message.content?.data as HoldingsData;
      const text = message.content?.text || "";
      let targetAddress: string | undefined;

      // Try to get specific wallet by number
      const walletMatch = text.match(
        /(?:holdings?\s+(?:for\s+)?)?wallet\s*(\d+)/i
      );
      if (walletMatch) {
        const walletNumber = parseInt(walletMatch[1]);
        const walletId = `wallet-${walletNumber}`;

        const walletResult = await service.getWalletById(walletId);
        if (walletResult.success && walletResult.data?.type === "eoa") {
          targetAddress = walletResult.data.eoaAddress;
        } else {
          throw new Error(
            `Wallet ${walletNumber} is not an EOA wallet. Holdings are only available for EOA wallets. Use "show portfolio" for smart account investments.`
          );
        }
      } else {
        // Show holdings for all EOA wallets
        const walletsResult = await service.getWalletCount();
        if (!walletsResult.success || !walletsResult.data) {
          throw new Error("Failed to get wallets");
        }

        const eoaWallets = walletsResult.data.wallets.filter(
          (w: any) => w.type === "eoa"
        );

        if (eoaWallets.length === 0) {
          const responseContent: Content = {
            text:
              `💼 **Your Token Holdings**\n\n` +
              `🚫 No EOA wallets found for holdings analysis.\n\n` +
              `💡 **To view holdings:**\n` +
              `• Import an EOA wallet: "Import EOA wallet with private key 0x..."\n` +
              `• Then check holdings: "show my holdings"\n\n` +
              `📊 **For DeFi investments:** Use "show portfolio" to see your managed portfolios`,
            source: message.content?.source || "user",
            data: { totalWallets: 0, eoaWallets: 0 },
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

        // For multiple wallets, we'll analyze the first one for now
        // TODO: Enhance to support multiple wallet analysis
        targetAddress = eoaWallets[0].eoaAddress;
      }

      if (!targetAddress) {
        throw new Error("No EOA address found for holdings analysis");
      }

      // Setup Orby for portfolio analysis
      const { virtualNodeProvider, accountCluster } = await service.orbySetup(
        process.env.ORBY_PRIVATE_INSTANCE_URL!,
        BigInt(5003),
        targetAddress
      );

      // Get comprehensive token portfolio using Orby
      logger.info("Fetching cross-chain token portfolio via Orby...");
      let portfolio;
      try {
        portfolio = await virtualNodeProvider.getFungibleTokenPortfolio(
          accountCluster.accountClusterId
        );
      } catch (error) {
        logger.error("Failed to fetch portfolio from Orby:", error);
        throw new Error(
          `Failed to connect to Orby portfolio service. Please check your connection and try again.`
        );
      }

      // Debug: Log portfolio structure
      logger.info(`Portfolio structure: ${JSON.stringify(portfolio, null, 2)}`);

      if (!portfolio || portfolio.length === 0) {
        const responseContent: Content = {
          text:
            `💼 **Your Token Holdings**\n\n` +
            `📍 **Wallet:** ${targetAddress}\n` +
            `🌐 **Network:** Mantle Sepolia Testnet\n\n` +
            `📊 **Holdings Summary:**\n` +
            `• No tokens detected across supported chains\n` +
            `• Total Value: $0.00\n\n` +
            `💡 **Getting Started:**\n` +
            `• Get testnet tokens: https://faucet.sepolia.mantle.xyz/\n` +
            `• Bridge tokens from other chains\n` +
            `• Start with small amounts for testing\n\n` +
            `🔄 **Cross-Chain Support:** Orby monitors multiple chains for your tokens`,
          source: message.content?.source || "user",
          data: {
            address: targetAddress,
            totalValue: 0,
            tokenCount: 0,
            chainCount: 0,
          },
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

      // Process portfolio data
      let totalValueUSD = 0;
      let tokensByChain: Record<string, any[]> = {};
      let gasTokens: any[] = [];
      let tokenDetails: string[] = [];

      for (const standardizedBalance of portfolio) {
        // Extract fiat value from Orby's actual data structure
        let tokenValue = 0;
        try {
          if (
            standardizedBalance.totalValueInFiat &&
            standardizedBalance.totalValueInFiat.numerator
          ) {
            // Simple approach: take first element of numerator array
            // For most token values, this will be sufficient
            const numeratorArray = standardizedBalance.totalValueInFiat
              .numerator as unknown as any[];
            if (numeratorArray.length > 0) {
              const firstElement = numeratorArray[0];
              // Convert from micro-dollars to dollars (Orby uses 6 decimal places)
              tokenValue = Number(firstElement) / 1000000;
            }
          }
        } catch (error) {
          logger.warn("Failed to get fiat value for token, using 0:", error);
          tokenValue = 0;
        }
        totalValueUSD += tokenValue;

        // Process token balances by chain
        for (const tokenBalance of standardizedBalance.tokenBalances) {
          const chainId = tokenBalance.token.chainId.toString();
          const chainName = getChainName(BigInt(chainId));

          if (!tokensByChain[chainName]) {
            tokensByChain[chainName] = [];
          }

          // Extract token amount from Orby's numerator structure
          let tokenAmount = 0;
          try {
            if (tokenBalance.numerator) {
              const numeratorArray = tokenBalance.numerator as unknown as any[];
              if (numeratorArray.length > 0) {
                // For most amounts, first element is sufficient
                // If needed, we can add multi-precision math later
                tokenAmount = Number(numeratorArray[0]);
                // Add second element if present (for larger amounts)
                if (numeratorArray.length > 1) {
                  tokenAmount += Number(numeratorArray[1]) * Math.pow(2, 32);
                }
              }
            }
          } catch (error) {
            logger.warn("Failed to get token amount, using 0:", error);
            tokenAmount = 0;
          }
          const tokenValueUSD = tokenValue;

          tokensByChain[chainName].push({
            address: tokenBalance.token.address,
            amount: tokenAmount,
            symbol: getTokenSymbol(tokenBalance.token),
            valueUSD: tokenValueUSD,
          });

          // Check if suitable for gas (>$0.50)
          if (tokenValue >= 0.5) {
            gasTokens.push({
              symbol: getTokenSymbol(tokenBalance.token),
              chain: chainName,
              value: tokenValueUSD,
              standardizedTokenId: standardizedBalance.standardizedTokenId,
            });
          }

          // Add to detailed view with improved formatting
          const symbol = getTokenSymbol(tokenBalance.token);
          const formattedValue = `$${tokenValueUSD.toFixed(2)}`.padEnd(8);
          const amount = formatTokenAmount(BigInt(tokenAmount));

          tokenDetails.push(
            `│ **${symbol}** ${amount} ${formattedValue} • ${chainName}`
          );
        }
      }

      // Build comprehensive response
      const chainCount = Object.keys(tokensByChain).length;
      const tokenCount = portfolio.length;

      // Sort gas tokens by value (best first)
      gasTokens.sort((a, b) => b.value - a.value);
      const topGasTokens = gasTokens.slice(0, 3);

      // Build chain distribution
      let chainDistribution = "";
      // Sort chains by value for better presentation
      const sortedChains = Object.entries(tokensByChain).sort((a, b) => {
        const valueA = a[1].reduce((sum, token) => sum + token.valueUSD, 0);
        const valueB = b[1].reduce((sum, token) => sum + token.valueUSD, 0);
        return valueB - valueA;
      });

      sortedChains.forEach(([chain, tokens], index) => {
        const chainValue = tokens.reduce(
          (sum, token) => sum + token.valueUSD,
          0
        );
        const percentage =
          totalValueUSD > 0
            ? ((chainValue / totalValueUSD) * 100).toFixed(1)
            : "0";

        // Add visual indicators for top chains
        const indicator =
          index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "│";
        const valueStr = `$${chainValue.toFixed(2)}`.padEnd(10);
        const percentStr = `${percentage}%`.padStart(6);

        chainDistribution += `${indicator} **${chain}** ${valueStr} (${percentStr})\n`;
      });

      const responseContent: Content = {
        text:
          `╭─────────────────────────────────────────╮\n` +
          `│  💎 **PORTFOLIO OVERVIEW** (Orby-Powered)  │\n` +
          `╰─────────────────────────────────────────╯\n\n` +
          `🔗 **Wallet:** \`${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}\`\n` +
          `💰 **Total Value:** **$${totalValueUSD.toFixed(2)}**\n` +
          `🌐 **Coverage:** ${chainCount} chains • ${tokenCount} tokens\n\n` +
          `┌─ 📊 **CHAIN DISTRIBUTION** ─┐\n` +
          `${chainDistribution}\n` +
          `└─────────────────────────────┘\n\n` +
          `┌─ 🪙 **TOKEN BREAKDOWN** ─┐\n` +
          `${tokenDetails.slice(0, 8).join("\n")}${tokenDetails.length > 8 ? "\n│ ⚡ **+ " + (tokenDetails.length - 8) + " more tokens**" : ""}\n` +
          `└─────────────────────────────┘\n\n` +
          `${
            topGasTokens.length > 0
              ? `┌─ ⛽ **OPTIMAL GAS TOKENS** ─┐\n` +
                topGasTokens
                  .map(
                    (token) =>
                      `│ ${token.symbol} **$${token.value.toFixed(2)}** • ${token.chain}`
                  )
                  .join("\n") +
                "\n" +
                `└─────────────────────────────┘\n\n`
              : `⚠️  **No gas-optimized tokens found** (minimum $0.50 required)\n\n`
          }` +
          `┌─ 🚀 **QUICK ACTIONS** ─┐\n` +
          `│ 📤 \`send [amount] [token] to 0x...\`\n` +
          `│ 📈 \`create portfolio with holdings\`\n` +
          `│ 👁️  \`show holdings for wallet [#]\`\n` +
          `└─────────────────────────────┘\n\n` +
          `✨ **Powered by Orby** • Cross-chain • Gas-optimized • Real-time`,
        source: message.content?.source || "user",
        data: {
          address: targetAddress,
          totalValue: totalValueUSD,
          tokenCount,
          chainCount,
          tokensByChain,
          gasTokens: topGasTokens,
          portfolio: portfolio.map((token) => {
            // Extract total value safely from Orby's structure
            let totalValue = 0;
            try {
              if (token.totalValueInFiat && token.totalValueInFiat.numerator) {
                const numeratorArray = token.totalValueInFiat
                  .numerator as unknown as any[];
                if (numeratorArray.length > 0) {
                  totalValue = Number(numeratorArray[0]);
                }
              }
            } catch (error) {
              console.warn("Failed to get total value for token:", error);
            }

            return {
              standardizedTokenId: token.standardizedTokenId,
              totalValue: totalValue,
              tokenBalances: token.tokenBalances.length,
            };
          }),
        },
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
      logger.error("Error in showHoldingsAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorContent: Content = {
        text:
          `❌ **Failed to fetch holdings:** ${errorMessage}\n\n` +
          `💡 **Troubleshooting:**\n` +
          `• Make sure you have imported an EOA wallet\n` +
          `• Check your internet connection\n` +
          `• Try: "import EOA wallet with private key 0x..."\n` +
          `• Or: "show my wallets" to see available wallets\n\n` +
          `🔧 **Alternative:** Use "show portfolio" for smart account investments`,
        source: message.content?.source || "user",
        data: { error: errorMessage },
      };

      if (callback) {
        await callback(errorContent);
      }

      return createActionResult({
        text: errorContent.text,
        data: errorContent.data as Record<string, any>,
        success: false,
        error: errorMessage,
      });
    }
  },
  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "show my holdings",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: '💼 **Your Token Holdings** (Orby-Powered)\n\n📍 **Wallet:** 0xB240...909a\n💰 **Total Value:** $847.32\n🌐 **Chains:** 2 | **Tokens:** 4\n\n📊 **Distribution by Chain:**\n• Mantle: $567.89 (67.0%)\n• Ethereum: $279.43 (33.0%)\n\n🔍 **Token Details:**\n• MNT: 125.27 ($312.68) on Mantle\n• USDC: 332.87 ($332.87) on Ethereum\n• ETH: 0.123 ($245.67) on Ethereum\n• USDT: 78.89 ($78.89) on Mantle\n\n⛽ **Best Gas Options:**\n• USDC ($332.87) on Ethereum\n• MNT ($312.68) on Mantle\n• ETH ($245.67) on Ethereum\n\n🚀 **Quick Actions:**\n• "send [amount] [token] to 0x..." - Transfer tokens\n• "create portfolio with holdings" - Start DeFi investing\n• "show holdings for wallet [#]" - Check specific wallet\n\n💡 **Powered by Orby:** Cross-chain analysis, gas optimization, and portfolio insights',
        },
      },
    ],
  ],
};

// Holdings Value Summary Action
export const holdingsValueAction: Action = {
  name: "HOLDINGS_VALUE",
  similes: [
    "HOLDINGS_VALUE",
    "TOTAL_HOLDINGS",
    "HOLDINGS_WORTH",
    "HOLDINGS_SUMMARY",
    "NET_WORTH",
  ],
  description: "Show total value summary of all token holdings",
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return (
      text.includes("holdings value") ||
      text.includes("total holdings") ||
      text.includes("holdings worth") ||
      text.includes("net worth") ||
      (text.includes("value") && text.includes("holdings"))
    );
  },
  handler: async function (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      logger.info("Calculating total holdings value");

      const service = runtime.getService(
        PimlicoWalletService.serviceType
      ) as PimlicoWalletService;
      if (!service) {
        throw new Error("Wallet service not found");
      }

      // Get all EOA wallets
      const walletsResult = await service.getWalletCount();
      if (!walletsResult.success || !walletsResult.data) {
        throw new Error("Failed to get wallets");
      }

      const eoaWallets = walletsResult.data.wallets.filter(
        (w: any) => w.type === "eoa"
      );

      if (eoaWallets.length === 0) {
        const responseContent: Content = {
          text:
            `💼 **Total Holdings Value**\n\n` +
            `💰 **Total:** $0.00\n` +
            `📊 **Wallets:** 0 EOA wallets\n` +
            `🌐 **Chains:** 0\n\n` +
            `💡 **Get Started:**\n` +
            `• Import EOA wallet: "Import EOA wallet with private key 0x..."\n` +
            `• Then check value: "holdings value"\n\n` +
            `📈 **Track Your Wealth:** Holdings value updates automatically across all chains`,
          source: message.content?.source || "user",
          data: { totalValue: 0, walletCount: 0 },
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

      let totalValue = 0;
      let totalTokens = 0;
      const chainsSeen = new Set<string>();
      const walletSummaries: string[] = [];

      // Analyze each EOA wallet
      for (const wallet of eoaWallets.slice(0, 5)) {
        // Limit to first 5 wallets for performance
        try {
          const { virtualNodeProvider, accountCluster } =
            await service.orbySetup(
              process.env.ORBY_PRIVATE_INSTANCE_URL!,
              BigInt(5003),
              wallet.eoaAddress
            );

          const portfolio = await virtualNodeProvider.getFungibleTokenPortfolio(
            accountCluster.accountClusterId
          );

          let walletValue = 0;
          let walletTokens = 0;

          if (portfolio && portfolio.length > 0) {
            for (const standardizedBalance of portfolio) {
              // Extract fiat value from Orby's actual data structure
              let tokenValue = 0;
              try {
                if (
                  standardizedBalance.totalValueInFiat &&
                  standardizedBalance.totalValueInFiat.numerator
                ) {
                  // Simple approach: take first element of numerator array
                  const numeratorArray = standardizedBalance.totalValueInFiat
                    .numerator as unknown as any[];
                  if (numeratorArray.length > 0) {
                    const firstElement = numeratorArray[0];
                    // Convert from micro-dollars to dollars
                    tokenValue = Number(firstElement) / 1000000;
                  }
                }
              } catch (error) {
                logger.warn(
                  `Failed to get fiat value for token in wallet ${wallet.name}:`,
                  error
                );
                tokenValue = 0;
              }

              walletValue += tokenValue;
              walletTokens += standardizedBalance.tokenBalances.length;

              // Track chains
              for (const tokenBalance of standardizedBalance.tokenBalances) {
                chainsSeen.add(getChainName(tokenBalance.token.chainId));
              }
            }
          }

          totalValue += walletValue;
          totalTokens += walletTokens;

          walletSummaries.push(
            `• ${wallet.name}: $${walletValue.toFixed(2)} (${walletTokens} tokens)`
          );
        } catch (error) {
          logger.warn(`Failed to analyze wallet ${wallet.name}:`, error);
          walletSummaries.push(`• ${wallet.name}: Analysis failed`);
        }
      }

      const responseContent: Content = {
        text:
          `💼 **Total Holdings Value** (Orby-Powered)\n\n` +
          `💰 **Grand Total:** $${totalValue.toFixed(2)}\n` +
          `📊 **Summary:** ${totalTokens} tokens across ${chainsSeen.size} chains\n` +
          `🔗 **EOA Wallets:** ${eoaWallets.length}\n\n` +
          `📋 **Breakdown by Wallet:**\n${walletSummaries.join("\n")}\n\n` +
          `🌐 **Supported Chains:** ${Array.from(chainsSeen).join(", ")}\n\n` +
          `🚀 **Quick Actions:**\n` +
          `• "show holdings" - Detailed token breakdown\n` +
          `• "create portfolio with $${Math.min(totalValue * 0.1, 100).toFixed(0)}" - Start investing\n` +
          `• "optimize gas payments" - Use best tokens for fees\n\n` +
          `💡 **Real-time tracking** across all your chains and wallets`,
        source: message.content?.source || "user",
        data: {
          totalValue,
          walletCount: eoaWallets.length,
          tokenCount: totalTokens,
          chainCount: chainsSeen.size,
          chains: Array.from(chainsSeen),
          walletBreakdown: walletSummaries,
        },
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
      logger.error("Error in holdingsValueAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorContent: Content = {
        text:
          `❌ **Failed to calculate holdings value:** ${errorMessage}\n\n` +
          `💡 **Try:**\n` +
          `• "show my wallets" - Check available wallets\n` +
          `• "import EOA wallet" - Add a wallet first\n` +
          `• "show holdings" - Individual wallet analysis`,
        source: message.content?.source || "user",
        data: { error: errorMessage },
      };

      if (callback) {
        await callback(errorContent);
      }

      return createActionResult({
        text: errorContent.text,
        data: errorContent.data as Record<string, any>,
        success: false,
        error: errorMessage,
      });
    }
  },
  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "holdings value",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: '💼 **Total Holdings Value** (Orby-Powered)\n\n💰 **Grand Total:** $1,247.89\n📊 **Summary:** 12 tokens across 3 chains\n🔗 **EOA Wallets:** 2\n\n📋 **Breakdown by Wallet:**\n• Wallet 1: $847.32 (8 tokens)\n• Wallet 2: $400.57 (4 tokens)\n\n🌐 **Supported Chains:** Mantle, Ethereum, Polygon\n\n🚀 **Quick Actions:**\n• "show holdings" - Detailed token breakdown\n• "create portfolio with $124" - Start investing\n• "optimize gas payments" - Use best tokens for fees\n\n💡 **Real-time tracking** across all your chains and wallets',
        },
      },
    ],
  ],
};

// Helper functions
function getChainName(chainId: bigint): string {
  const chains: Record<string, string> = {
    // Ethereum
    "1": "Ethereum",
    "5": "Ethereum Goerli",
    "11155111": "Ethereum Sepolia",

    // Mantle
    "5000": "Mantle",
    "5001": "Mantle Testnet",
    "5003": "Mantle Sepolia",

    // Polygon
    "137": "Polygon",
    "80001": "Polygon Mumbai",
    "80002": "Polygon Amoy",

    // Arbitrum
    "42161": "Arbitrum One",
    "421613": "Arbitrum Goerli",
    "421614": "Arbitrum Sepolia",

    // Optimism
    "10": "Optimism",
    "420": "Optimism Goerli",
    "11155420": "Optimism Sepolia",

    // Base
    "8453": "Base",
    "84531": "Base Goerli",
    "84532": "Base Sepolia",

    // BSC
    "56": "BSC",
    "97": "BSC Testnet",

    // Holesky
    "17000": "Holesky",

    // Sonic
    "57054": "Sonic Testnet",

    // Other common chains
    "43114": "Avalanche",
    "250": "Fantom",
    "25": "Cronos",
  };
  return chains[chainId.toString()] || `Chain ${chainId}`;
}

function getTokenSymbol(tokenOrAddress: any): string {
  // If it's a token object with symbol, use that
  if (typeof tokenOrAddress === "object" && tokenOrAddress.symbol) {
    return tokenOrAddress.symbol;
  }

  // If it's just an address string, try to map it
  if (typeof tokenOrAddress === "string") {
    const symbols: Record<string, string> = {
      "0x0000000000000000000000000000000000000000": "ETH", // Generic native token
    };

    return (
      symbols[tokenOrAddress.toLowerCase()] ||
      `Token(${tokenOrAddress.slice(0, 6)}...)`
    );
  }

  return "UNKNOWN";
}

function formatTokenAmount(amount: bigint): string {
  const formatted = Number(amount) / 1e18; // Assume 18 decimals for simplicity
  if (formatted < 0.001) return "<0.001";
  if (formatted < 1) return formatted.toFixed(4);
  if (formatted < 1000) return formatted.toFixed(2);
  return formatted.toFixed(0);
}
