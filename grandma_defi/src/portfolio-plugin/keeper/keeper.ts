import { logger } from "@elizaos/core";
import { createPublicClient, http, encodeFunctionData } from "viem";
import { mantleSepoliaTestnet } from "viem/chains";
import { ADDRESSES } from "../config/addresses";
import { PORTFOLIO_MANAGER_ABI } from "../config/abi";

export class PortfolioKeeper {
  private interval: NodeJS.Timeout | null = null;
  private publicClient;
  private isRunning = false;

  constructor() {
    // Initialize public client for reading blockchain data
    this.publicClient = createPublicClient({
      chain: mantleSepoliaTestnet,
      transport: http(),
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("⚠️ Portfolio Keeper is already running");
      return;
    }

    logger.info("🤖 Starting Portfolio Keeper automation");
    this.isRunning = true;

    // Run initial check
    await this.executeKeeperCycle();

    // Set up recurring execution every 2 minutes
    this.interval = setInterval(async () => {
      try {
        await this.executeKeeperCycle();
      } catch (error) {
        logger.error("❌ Error in keeper cycle:", error);
      }
    }, 120000); // 2 minutes

    logger.info("✅ Portfolio Keeper started successfully");
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn("⚠️ Portfolio Keeper is not running");
      return;
    }

    logger.info("🛑 Stopping Portfolio Keeper automation");
    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    logger.info("✅ Portfolio Keeper stopped successfully");
  }

  private async executeKeeperCycle(): Promise<void> {
    try {
      logger.info("🔄 Executing keeper cycle...");

      // 1. Check for ready actions
      const readyActions = await this.getReadyActions();

      if (readyActions.length > 0) {
        logger.info(`📋 Found ${readyActions.length} ready actions to execute`);
        await this.notifyReadyActions(readyActions);
      } else {
        logger.info("✅ No actions ready for execution");
      }

      // 2. Update peak prices for monitoring
      await this.monitorPortfolios();

      logger.info("🔄 Keeper cycle completed");
    } catch (error) {
      logger.error("❌ Error in keeper cycle execution:", error);
    }
  }

  private async getReadyActions(): Promise<number[]> {
    try {
      const readyActions = (await this.publicClient.readContract({
        address: ADDRESSES.PortfolioManager as any,
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: "getReadyActions",
      })) as bigint[];

      return readyActions ? readyActions.map((id) => Number(id)) : [];
    } catch (error) {
      logger.error("❌ Error getting ready actions:", error);
      return [];
    }
  }

  private async notifyReadyActions(actionIds: number[]): Promise<void> {
    try {
      logger.info(`🎯 Ready actions detected: ${actionIds.join(", ")}`);

      // In a full implementation, you could:
      // 1. Send notifications to users about ready actions
      // 2. Auto-execute if user has enabled auto-execution
      // 3. Log detailed action information

      for (const actionId of actionIds) {
        await this.logActionDetails(actionId);
      }
    } catch (error) {
      logger.error("❌ Error notifying ready actions:", error);
    }
  }

  private async logActionDetails(actionId: number): Promise<void> {
    try {
      // This would get detailed action information
      logger.info(`📝 Action ${actionId} is ready for execution`);

      // In production, you might want to:
      // - Get action details from smart contract
      // - Notify the user via the agent
      // - Store action status in database
    } catch (error) {
      logger.error(`❌ Error logging action ${actionId}:`, error);
    }
  }

  private async monitorPortfolios(): Promise<void> {
    try {
      // This would monitor portfolio performance and conditions
      logger.info("📈 Monitoring portfolio conditions...");

      // In a full implementation, you could:
      // 1. Check all active portfolios
      // 2. Monitor stop-loss/take-profit conditions
      // 3. Track performance metrics
      // 4. Alert users of significant changes
    } catch (error) {
      logger.error("❌ Error monitoring portfolios:", error);
    }
  }

  /**
   * Manual trigger for keeper actions (useful for testing)
   */
  async triggerManualExecution(): Promise<void> {
    logger.info("🔧 Manual keeper execution triggered");
    await this.executeKeeperCycle();
  }

  /**
   * Get keeper status
   */
  getStatus(): { isRunning: boolean; lastExecution?: Date } {
    return {
      isRunning: this.isRunning,
      lastExecution: new Date(), // In production, you'd track this properly
    };
  }

  /**
   * Check specific portfolio health
   */
  async checkPortfolioHealth(portfolioId: number): Promise<any> {
    try {
      logger.info(`🏥 Checking health of portfolio ${portfolioId}`);

      // This would check:
      // - Current vs target allocations
      // - Performance metrics
      // - Risk indicators
      // - Rebalancing needs

      return {
        portfolioId,
        healthy: true,
        needsRebalancing: false,
        lastCheck: new Date(),
      };
    } catch (error) {
      logger.error(`❌ Error checking portfolio ${portfolioId} health:`, error);
      return {
        portfolioId,
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Emergency stop for all automated actions
   */
  async emergencyStop(): Promise<void> {
    logger.warn("🚨 Emergency stop triggered for Portfolio Keeper");
    await this.stop();
  }
}
