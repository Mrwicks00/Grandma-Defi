import { type IAgentRuntime, logger, Service } from "@elizaos/core";
import {
  setupCrossChainMessenger,
  depositMNT,
  withdrawMNT,
  getBalances,
  checkMessageStatus,
} from "./provider";

export class BridgeService extends Service {
  static serviceType = "bridge_service";

  capabilityDescription =
    "This plugin enables MNT bridging between Mantle and Ethereum networks using Mantle SDK";

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<BridgeService> {
    logger.info("*** Starting Bridge service ***");
    return new BridgeService(runtime);
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(BridgeService.serviceType);
    if (!service) {
      throw new Error("Bridge service not found");
    }
    await service.stop();
  }

  async stop(): Promise<void> {
    logger.info("*** Stopping Bridge service instance ***");
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Test if we can initialize the cross-chain messenger
      await setupCrossChainMessenger();
      return true;
    } catch (error) {
      logger.error("Bridge configuration validation failed:", error);
      return false;
    }
  }

  async bridgeMntToEth(privateKey: string, amount: string) {
    try {
      logger.info(`Bridging ${amount} MNT from Mantle to Ethereum`);

      const result = await depositMNT(privateKey, amount);
      return {
        success: true,
        data: {
          transactionHash: result.transactionHash,
          amount: amount,
          direction: "Mantle to Ethereum",
          status: "PENDING",
          estimatedTime: "10-15 minutes",
          explorerUrl: `https://sepolia.etherscan.io/tx/${result.transactionHash}`,
        },
      };
    } catch (error) {
      logger.error("Error bridging MNT to Ethereum:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async bridgeMntFromEth(privateKey: string, amount: string) {
    try {
      logger.info(`Bridging ${amount} MNT from Ethereum to Mantle`);

      const result = await withdrawMNT(privateKey, amount);
      return {
        success: true,
        data: {
          transactionHash: result.transactionHash,
          amount: amount,
          direction: "Ethereum to Mantle",
          status: "PENDING",
          estimatedTime: "10-15 minutes",
          explorerUrl: `https://sepolia.mantlescan.xyz/tx/${result.transactionHash}`,
        },
      };
    } catch (error) {
      logger.error("Error bridging MNT from Ethereum:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async checkBridgeStatus(transactionHash: string) {
    try {
      logger.info(`Checking bridge status for transaction: ${transactionHash}`);

      const status = await checkMessageStatus(transactionHash);
      return {
        success: true,
        data: {
          transactionHash: transactionHash,
          status: status.status,
          message: status.message,
          estimatedCompletion: status.estimatedCompletion,
        },
      };
    } catch (error) {
      logger.error("Error checking bridge status:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getBridgeBalances(privateKey: string) {
    try {
      logger.info("Getting bridge balances for both networks");

      const balances = await getBalances(privateKey);
      return {
        success: true,
        data: {
          ethereumBalance: balances.ethereumBalance,
          mantleBalance: balances.mantleBalance,
          ethereumEthBalance: balances.ethereumEthBalance,
          mantleMntBalance: balances.mantleMntBalance,
          ethereumAddress: balances.ethereumAddress,
          mantleAddress: balances.mantleAddress,
        },
      };
    } catch (error) {
      logger.error("Error getting bridge balances:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
