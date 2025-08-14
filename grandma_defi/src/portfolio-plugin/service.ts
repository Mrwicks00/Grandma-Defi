import { type IAgentRuntime, logger, Service } from "@elizaos/core";
import { createSmartAccountFromPrivateKey } from "../smart-account-plugin/provider";
import { PortfolioKeeper } from "./keeper/keeper";
import { ADDRESSES } from "./config/addresses";
import { PORTFOLIO_MANAGER_ABI } from "./config/abi";
import { encodeFunctionData, parseEther } from "viem";

export class PortfolioService extends Service {
  static serviceType = "portfolio_manager";

  capabilityDescription =
    "AI-powered DeFi portfolio management with smart contract integration and automated rebalancing";

  private keeper!: PortfolioKeeper;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<PortfolioService> {
    logger.info("🎯 Starting Portfolio Manager service");

    const service = new PortfolioService(runtime);

    // Initialize and start the keeper for automated actions
    service.keeper = new PortfolioKeeper();
    await service.keeper.start();

    logger.info("✅ Portfolio Manager service started with automation");
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(
      PortfolioService.serviceType
    ) as PortfolioService;
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    logger.info("🛑 Stopping Portfolio Manager service");
    if (this.keeper) {
      await this.keeper.stop();
    }
  }

  /**
   * Create a new portfolio using the smart contract
   */
  async createPortfolio(
    privateKey: string,
    tokens: string[],
    allocations: number[],
    rebalanceThreshold: number,
    initialValue: string
  ) {
    try {
      logger.info(`Creating portfolio with ${tokens.length} tokens`);

      // Get smart account client
      const { smartAccountClient } =
        await createSmartAccountFromPrivateKey(privateKey);

      // Prepare the contract call data
      const callData = encodeFunctionData({
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: "createPortfolio",
        args: [
          tokens as readonly `0x${string}`[],
          allocations.map((a) => BigInt(a)),
          BigInt(rebalanceThreshold),
        ],
      });

      // Send transaction to create portfolio
      const txHash = await smartAccountClient.sendUserOperation({
        calls: [
          {
            to: ADDRESSES.PortfolioManager as any,
            value: parseEther(initialValue),
            data: callData,
          },
        ],
        account: undefined, // Use default
        // Add longer timeout for complex portfolio operations
        maxFeePerGas: undefined, // Use default
        maxPriorityFeePerGas: undefined, // Use default
      });

      logger.info(`Portfolio creation transaction sent: ${txHash}`);

      // Wait a moment for transaction to be processed, then get user's portfolio list
      // This is a workaround since we can't easily get the portfolio ID from the transaction
      setTimeout(async () => {
        try {
          const userPortfolios = await this.getUserPortfolios(privateKey);
          if (userPortfolios.success && userPortfolios.data) {
            const portfolioIds = userPortfolios.data.portfolioIds;
            if (portfolioIds.length > 0) {
              const latestPortfolioId = portfolioIds[portfolioIds.length - 1];
              logger.info(`Latest portfolio ID for user: ${latestPortfolioId}`);
            }
          }
        } catch (error) {
          logger.warn("Could not fetch latest portfolio ID:", error);
        }
      }, 3000); // Wait 3 seconds for transaction to be processed

      return {
        success: true,
        data: {
          transactionHash: txHash,
          portfolioAddress: ADDRESSES.PortfolioManager,
          tokens,
          allocations,
          initialValue,
          explorerUrl: `https://sepolia.mantlescan.xyz/tx/${txHash}`,
          // Note: Portfolio ID will be available after transaction is confirmed
          // Use "Get my portfolios" to see your portfolio IDs
        },
      };
    } catch (error) {
      logger.error("Error creating portfolio:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get portfolio information from the smart contract
   */
  async getPortfolio(privateKey: string, portfolioId: number) {
    try {
      logger.info(`Getting portfolio info for ID: ${portfolioId}`);

      // Get smart account client for reading data
      const { publicClient, smartAccount } =
        await createSmartAccountFromPrivateKey(privateKey);

      // Read portfolio data from smart contract
      const portfolioData = await publicClient.readContract({
        address: ADDRESSES.PortfolioManager as any,
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: "getPortfolio",
        args: [BigInt(portfolioId)],
      });

      const [
        owner,
        tokens,
        targetAllocations,
        currentBalances,
        totalValueUSD,
        active,
      ] = portfolioData as any;

      logger.info(`Retrieved portfolio data for owner: ${owner}`);

      // Check if the portfolio belongs to this user
      if (owner.toLowerCase() !== smartAccount.address.toLowerCase()) {
        return {
          success: false,
          error: `Portfolio ${portfolioId} belongs to ${owner.slice(0, 6)}...${owner.slice(-4)}, not your wallet ${smartAccount.address.slice(0, 6)}...${smartAccount.address.slice(-4)}. You can only view your own portfolios.`,
        };
      }

      return {
        success: true,
        data: {
          portfolioId,
          owner,
          tokens,
          targetAllocations: (targetAllocations as bigint[]).map((a) =>
            a.toString()
          ),
          currentBalances: (currentBalances as bigint[]).map((b) =>
            b.toString()
          ),
          totalValueUSD: (Number(totalValueUSD) / 1e8).toString(),
          active,
          smartAccountAddress: smartAccount.address,
        },
      };
    } catch (error) {
      logger.error("Error getting portfolio:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user's portfolio IDs
   */
  async getUserPortfolios(privateKey: string) {
    try {
      const { publicClient, smartAccount } =
        await createSmartAccountFromPrivateKey(privateKey);

      // Read user portfolios from smart contract
      const userPortfolios = await publicClient.readContract({
        address: ADDRESSES.PortfolioManager as any,
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: "getUserPortfolios",
        args: [smartAccount.address],
      });

      logger.info(
        `Found ${(userPortfolios as any).length} portfolios for user`
      );

      return {
        success: true,
        data: {
          portfolioIds: (userPortfolios as bigint[]).map((id) => Number(id)),
          userAddress: smartAccount.address,
        },
      };
    } catch (error) {
      logger.error("Error getting user portfolios:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Perform a token swap within a portfolio (triggers rebalance)
   */
  async swapToken(
    privateKey: string,
    portfolioId: number,
    fromToken: string,
    toToken: string,
    amount: string
  ) {
    try {
      logger.info(
        `Swapping ${amount} of ${fromToken} to ${toToken} in portfolio ${portfolioId}`
      );

      const { smartAccountClient } =
        await createSmartAccountFromPrivateKey(privateKey);

      // For now, we'll trigger a rebalance which will handle the swap
      // In a full implementation, you might want specific swap functions
      const callData = encodeFunctionData({
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: "rebalanceNow",
        args: [BigInt(portfolioId)],
      });

      const txHash = await smartAccountClient.sendUserOperation({
        calls: [
          {
            to: ADDRESSES.PortfolioManager as any,
            value: 0n,
            data: callData,
          },
        ],
      });

      logger.info(`Swap/rebalance transaction sent: ${txHash}`);

      return {
        success: true,
        data: {
          transactionHash: txHash,
          portfolioId,
          fromToken,
          toToken,
          amount,
          explorerUrl: `https://sepolia.mantlescan.xyz/tx/${txHash}`,
        },
      };
    } catch (error) {
      logger.error("Error performing swap:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Trigger manual rebalancing of a portfolio
   */
  async rebalancePortfolio(privateKey: string, portfolioId: number) {
    try {
      logger.info(`Manually rebalancing portfolio ${portfolioId}`);

      const { smartAccountClient } =
        await createSmartAccountFromPrivateKey(privateKey);

      const callData = encodeFunctionData({
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: "rebalanceNow",
        args: [BigInt(portfolioId)],
      });

      const txHash = await smartAccountClient.sendUserOperation({
        calls: [
          {
            to: ADDRESSES.PortfolioManager as any,
            value: 0n,
            data: callData,
          },
        ],
      });

      logger.info(`Rebalance transaction sent: ${txHash}`);

      return {
        success: true,
        data: {
          transactionHash: txHash,
          portfolioId,
          explorerUrl: `https://sepolia.mantlescan.xyz/tx/${txHash}`,
        },
      };
    } catch (error) {
      logger.error("Error rebalancing portfolio:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Schedule an automated action (stop-loss, take-profit, etc.)
   */
  async scheduleAction(
    privateKey: string,
    portfolioId: number,
    actionType: number,
    executeTime: number,
    tokens: string[],
    allocations: number[],
    conditionToken: string,
    priceCondition: number,
    percentageCondition: number,
    description: string
  ) {
    try {
      logger.info(
        `Scheduling action for portfolio ${portfolioId}: ${description}`
      );

      const { smartAccountClient } =
        await createSmartAccountFromPrivateKey(privateKey);

      const callData = encodeFunctionData({
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: "scheduleAction",
        args: [
          BigInt(portfolioId),
          Number(actionType),
          BigInt(executeTime),
          tokens as readonly `0x${string}`[],
          allocations.map((a) => BigInt(a)),
          conditionToken as `0x${string}`,
          BigInt(priceCondition),
          BigInt(percentageCondition),
          description,
        ],
      });

      const txHash = await smartAccountClient.sendUserOperation({
        calls: [
          {
            to: ADDRESSES.PortfolioManager as any,
            value: 0n,
            data: callData,
          },
        ],
      });

      logger.info(`Schedule action transaction sent: ${txHash}`);

      return {
        success: true,
        data: {
          transactionHash: txHash,
          portfolioId,
          actionType,
          description,
          explorerUrl: `https://sepolia.mantlescan.xyz/tx/${txHash}`,
        },
      };
    } catch (error) {
      logger.error("Error scheduling action:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get token price from the smart contract
   */
  async getTokenPrice(privateKey: string, tokenAddress: string) {
    try {
      const { publicClient } =
        await createSmartAccountFromPrivateKey(privateKey);

      const price = await publicClient.readContract({
        address: ADDRESSES.PortfolioManager as any,
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: "getTokenPrice",
        args: [tokenAddress as `0x${string}`],
      });

      return {
        success: true,
        data: {
          tokenAddress,
          price: price.toString(),
        },
      };
    } catch (error) {
      logger.error("Error getting token price:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get token tracking data (entry price, peak price, etc.)
   */
  async getTokenTracking(
    privateKey: string,
    portfolioId: number,
    tokenAddress: string
  ) {
    try {
      const { publicClient } =
        await createSmartAccountFromPrivateKey(privateKey);

      const tracking = await publicClient.readContract({
        address: ADDRESSES.PortfolioManager as any,
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: "getTokenTracking",
        args: [BigInt(portfolioId), tokenAddress as `0x${string}`],
      });

      const [
        entryPrice,
        peakPrice,
        peakTimestamp,
        lastUpdateTime,
        changeFromEntry,
        dropFromPeak,
      ] = tracking as any;

      return {
        success: true,
        data: {
          portfolioId,
          tokenAddress,
          entryPrice: entryPrice.toString(),
          peakPrice: peakPrice.toString(),
          peakTimestamp: peakTimestamp.toString(),
          lastUpdateTime: lastUpdateTime.toString(),
          changeFromEntry: changeFromEntry.toString(),
          dropFromPeak: dropFromPeak.toString(),
        },
      };
    } catch (error) {
      logger.error("Error getting token tracking:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
