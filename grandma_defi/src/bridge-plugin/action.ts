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
import { BridgeService } from "./service";

// Define types for bridge data
interface BridgeData {
  privateKey?: string;
  amount?: string;
  direction?: "to_ethereum" | "from_ethereum";
  transactionHash?: string;
}

export const bridgeMntToEthAction: Action = {
  name: "BRIDGE_MNT_TO_ETH",
  similes: [
    "BRIDGE_TO_ETHEREUM",
    "SEND_MNT_TO_ETH",
    "TRANSFER_MNT_TO_ETH",
    "BRIDGE_TO_ETH",
    "MOVE_MNT_TO_ETHEREUM",
  ],
  description: "Bridge MNT tokens from Mantle to Ethereum network",
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    const messageData = message.content?.data as BridgeData;

    // Check if amount is provided in data
    if (messageData?.amount) {
      const amount = parseFloat(messageData.amount);
      return !isNaN(amount) && amount > 0;
    }

    // Check if amount is mentioned in text
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:MNT|mnt)?/);
    return amountMatch !== null;
  },
  handler: async function (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      logger.info("Bridging MNT to Ethereum");

      const messageData = message.content?.data as BridgeData;
      let privateKey: string | undefined = messageData?.privateKey;
      let amount: string | undefined = messageData?.amount;

      // Extract from text if not in data
      if (!amount) {
        const text = message.content?.text || "";
        const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:MNT|mnt)?/);
        if (amountMatch) {
          amount = amountMatch[1];
        }
      }

      // Get private key from bridge wallet number if not provided
      if (!privateKey) {
        const text = message.content?.text || "";
        const walletNumberMatch = text.match(
          /(?:from\s+)?bridge\s+wallet\s*(\d+)/i
        );
        if (walletNumberMatch) {
          const walletNumber = parseInt(walletNumberMatch[1], 10);
          if (walletNumber === 1)
            privateKey =
              "0xc262dcd2ca2bb3f42084b71aef883aab080862503cc1bd3add9967c318e31bb9";
          else if (walletNumber === 2)
            privateKey =
              "0x9168d38bf135bcf1fdf0512d7c4479340597615a5c15e9488c79df9946469a22";
          else if (walletNumber === 3)
            privateKey =
              "0xe0049f43a0ea174743e52c37cd04c8b7db122ae301d2169115d1852af6500c1a";
        }
      }

      if (!amount) {
        throw new Error(
          "Please specify the amount of MNT to bridge. Example: 'Bridge 10 MNT to Ethereum'"
        );
      }

      if (!privateKey) {
        throw new Error(
          "Please specify which bridge wallet to use. Example: 'Bridge 10 MNT from bridge wallet 1 to Ethereum'"
        );
      }

      const service = runtime.getService(
        BridgeService.serviceType
      ) as BridgeService;
      if (!service) {
        throw new Error("Bridge service not found");
      }

      const result = await service.bridgeMntToEth(privateKey, amount);
      if (!result.success) {
        throw new Error(result.error || "Bridge operation failed");
      }

      const bridgeData = result.data;

      const responseContent: Content = {
        text:
          `🌉 **Bridge initiated successfully!**\n\n` +
          `💸 **Amount:** ${amount} MNT\n` +
          `📍 **Direction:** Mantle → Ethereum\n` +
          `🧾 **Transaction Hash:** ${bridgeData?.transactionHash}\n` +
          `🔗 **Explorer:** ${bridgeData?.explorerUrl}\n` +
          `⏱️ **Estimated Time:** ${bridgeData?.estimatedTime}\n\n` +
          `📊 **Status:** ${bridgeData?.status}\n\n` +
          `💡 **What happens next:**\n` +
          `• Transaction will be processed on Mantle\n` +
          `• MNT will be locked on Mantle\n` +
          `• After 10-15 minutes, MNT will appear on Ethereum\n\n` +
          `🔍 **Check status:** "Check bridge status for ${bridgeData?.transactionHash}"`,
        source: message.content?.source || "user",
        data: bridgeData,
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
      logger.error("Error in bridgeMntToEthAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorContent: Content = {
        text:
          `❌ **Bridge failed:** ${errorMessage}\n\n` +
          `💡 **How to bridge MNT to Ethereum:**\n` +
          `• "Bridge 10 MNT from bridge wallet 1 to Ethereum"\n` +
          `• "Send 5 MNT to Ethereum"\n` +
          `• Make sure you have sufficient MNT balance on Mantle`,
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
          text: "Bridge 10 MNT from bridge wallet 1 to Ethereum",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: '🌉 **Bridge initiated successfully!**\n\n💸 **Amount:** 10 MNT\n📍 **Direction:** Mantle → Ethereum\n🧾 **Transaction Hash:** 0x...\n🔗 **Explorer:** https://sepolia.etherscan.io/tx/0x...\n⏱️ **Estimated Time:** 10-15 minutes\n\n📊 **Status:** PENDING\n\n💡 **What happens next:**\n• Transaction will be processed on Mantle\n• MNT will be locked on Mantle\n• After 10-15 minutes, MNT will appear on Ethereum\n\n🔍 **Check status:** "Check bridge status for 0x..."',
        },
      },
    ],
  ],
};

export const bridgeMntFromEthAction: Action = {
  name: "BRIDGE_MNT_FROM_ETH",
  similes: [
    "BRIDGE_FROM_ETHEREUM",
    "SEND_MNT_FROM_ETH",
    "TRANSFER_MNT_FROM_ETH",
    "BRIDGE_FROM_ETH",
    "MOVE_MNT_FROM_ETHEREUM",
  ],
  description: "Bridge MNT tokens from Ethereum to Mantle network",
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    const messageData = message.content?.data as BridgeData;

    // Check if amount is provided in data
    if (messageData?.amount) {
      const amount = parseFloat(messageData.amount);
      return !isNaN(amount) && amount > 0;
    }

    // Check if amount is mentioned in text
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:MNT|mnt)?/);
    return amountMatch !== null;
  },
  handler: async function (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      logger.info("Bridging MNT from Ethereum");

      const messageData = message.content?.data as BridgeData;
      let privateKey: string | undefined = messageData?.privateKey;
      let amount: string | undefined = messageData?.amount;

      // Extract from text if not in data
      if (!amount) {
        const text = message.content?.text || "";
        const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:MNT|mnt)?/);
        if (amountMatch) {
          amount = amountMatch[1];
        }
      }

      // Get private key from bridge wallet number if not provided
      if (!privateKey) {
        const text = message.content?.text || "";
        const walletNumberMatch = text.match(
          /(?:from\s+)?bridge\s+wallet\s*(\d+)/i
        );
        if (walletNumberMatch) {
          const walletNumber = parseInt(walletNumberMatch[1], 10);
          if (walletNumber === 1)
            privateKey =
              "0xc262dcd2ca2bb3f42084b71aef883aab080862503cc1bd3add9967c318e31bb9";
          else if (walletNumber === 2)
            privateKey =
              "0x9168d38bf135bcf1fdf0512d7c4479340597615a5c15e9488c79df9946469a22";
          else if (walletNumber === 3)
            privateKey =
              "0xe0049f43a0ea174743e52c37cd04c8b7db122ae301d2169115d1852af6500c1a";
        }
      }

      if (!amount) {
        throw new Error(
          "Please specify the amount of MNT to bridge. Example: 'Bridge 10 MNT from Ethereum'"
        );
      }

      if (!privateKey) {
        throw new Error(
          "Please specify which bridge wallet to use. Example: 'Bridge 10 MNT from Ethereum to bridge wallet 1'"
        );
      }

      const service = runtime.getService(
        BridgeService.serviceType
      ) as BridgeService;
      if (!service) {
        throw new Error("Bridge service not found");
      }

      const result = await service.bridgeMntFromEth(privateKey, amount);
      if (!result.success) {
        throw new Error(result.error || "Bridge operation failed");
      }

      const bridgeData = result.data;

      const responseContent: Content = {
        text:
          `🌉 **Bridge initiated successfully!**\n\n` +
          `💸 **Amount:** ${amount} MNT\n` +
          `📍 **Direction:** Ethereum → Mantle\n` +
          `🧾 **Transaction Hash:** ${bridgeData?.transactionHash}\n` +
          `🔗 **Explorer:** ${bridgeData?.explorerUrl}\n` +
          `⏱️ **Estimated Time:** ${bridgeData?.estimatedTime}\n\n` +
          `📊 **Status:** ${bridgeData?.status}\n\n` +
          `💡 **What happens next:**\n` +
          `• Transaction will be processed on Mantle\n` +
          `• MNT will be withdrawn from Ethereum\n` +
          `• After 10-15 minutes, MNT will appear on Mantle\n\n` +
          `🔍 **Check status:** "Check bridge status for ${bridgeData?.transactionHash}"`,
        source: message.content?.source || "user",
        data: bridgeData,
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
      logger.error("Error in bridgeMntFromEthAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorContent: Content = {
        text:
          `❌ **Bridge failed:** ${errorMessage}\n\n` +
          `💡 **How to bridge MNT from Ethereum:**\n` +
          `• "Bridge 10 MNT from Ethereum to bridge wallet 1"\n` +
          `• "Send 5 MNT from Ethereum"\n` +
          `• Make sure you have sufficient MNT balance on Ethereum`,
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
          text: "Bridge 10 MNT from Ethereum to bridge wallet 1",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: '🌉 **Bridge initiated successfully!**\n\n💸 **Amount:** 10 MNT\n📍 **Direction:** Ethereum → Mantle\n🧾 **Transaction Hash:** 0x...\n🔗 **Explorer:** https://sepolia.mantlescan.xyz/tx/0x...\n⏱️ **Estimated Time:** 10-15 minutes\n\n📊 **Status:** PENDING\n\n💡 **What happens next:**\n• Transaction will be processed on Mantle\n• MNT will be withdrawn from Ethereum\n• After 10-15 minutes, MNT will appear on Mantle\n\n🔍 **Check status:** "Check bridge status for 0x..."',
        },
      },
    ],
  ],
};

export const checkBridgeStatusAction: Action = {
  name: "CHECK_BRIDGE_STATUS",
  similes: [
    "BRIDGE_STATUS",
    "CHECK_BRIDGE",
    "BRIDGE_PROGRESS",
    "STATUS_BRIDGE",
    "BRIDGE_TRANSACTION_STATUS",
  ],
  description: "Check the status of a bridge transaction",
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    const messageData = message.content?.data as BridgeData;

    // Check if transaction hash is provided in data
    if (messageData?.transactionHash) {
      return (
        messageData.transactionHash.startsWith("0x") &&
        messageData.transactionHash.length === 66
      );
    }

    // Check if transaction hash is mentioned in text
    const txHashMatch = text.match(/0x[a-fA-F0-9]{64}/);
    return txHashMatch !== null;
  },
  handler: async function (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      logger.info("Checking bridge status");

      const messageData = message.content?.data as BridgeData;
      let transactionHash: string | undefined = messageData?.transactionHash;

      // Extract from text if not in data
      if (!transactionHash) {
        const text = message.content?.text || "";
        const txHashMatch = text.match(/0x[a-fA-F0-9]{64}/);
        if (txHashMatch) {
          transactionHash = txHashMatch[0];
        }
      }

      if (!transactionHash) {
        throw new Error(
          "Please provide a transaction hash to check. Example: 'Check bridge status for 0x...'"
        );
      }

      const service = runtime.getService(
        BridgeService.serviceType
      ) as BridgeService;
      if (!service) {
        throw new Error("Bridge service not found");
      }

      const result = await service.checkBridgeStatus(transactionHash);
      if (!result.success) {
        throw new Error(result.error || "Failed to check bridge status");
      }

      const statusData = result.data;

      const responseContent: Content = {
        text:
          `🔍 **Bridge Status Check**\n\n` +
          `🧾 **Transaction Hash:** ${transactionHash}\n` +
          `📊 **Status:** ${statusData?.status}\n` +
          `💬 **Message:** ${statusData?.message}\n` +
          `⏱️ **Estimated Completion:** ${statusData?.estimatedCompletion}\n\n` +
          `💡 **Status Guide:**\n` +
          `• **PENDING:** Transaction submitted, waiting for processing\n` +
          `• **IN_CHALLENGE_PERIOD:** 7-day security period\n` +
          `• **READY_FOR_RELAY:** Ready to finalize\n` +
          `• **RELAYED:** Bridge completed successfully!`,
        source: message.content?.source || "user",
        data: statusData,
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
      logger.error("Error in checkBridgeStatusAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorContent: Content = {
        text:
          `❌ **Status check failed:** ${errorMessage}\n\n` +
          `💡 **How to check bridge status:**\n` +
          `• "Check bridge status for 0x..."\n` +
          `• "What's the status of bridge 0x..."\n` +
          `• Provide the transaction hash from your bridge operation`,
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
          text: "Check bridge status for 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "🔍 **Bridge Status Check**\n\n🧾 **Transaction Hash:** 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\n📊 **Status:** PENDING\n💬 **Message:** Transaction submitted to L1, waiting for confirmation...\n⏱️ **Estimated Completion:** 2-5 minutes\n\n💡 **Status Guide:**\n• **PENDING:** Transaction submitted, waiting for processing\n• **IN_CHALLENGE_PERIOD:** 7-day security period\n• **READY_FOR_RELAY:** Ready to finalize\n• **RELAYED:** Bridge completed successfully!",
        },
      },
    ],
  ],
};

export const getBridgeBalancesAction: Action = {
  name: "GET_BRIDGE_BALANCES",
  similes: [
    "BRIDGE_BALANCES",
    "CHECK_BRIDGE_BALANCES",
    "BALANCES_BOTH_NETWORKS",
    "MNT_BALANCES",
    "CROSS_CHAIN_BALANCES",
  ],
  description: "Get MNT balances on both Ethereum and Mantle networks",
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
      logger.info("Getting bridge balances");

      const messageData = message.content?.data as BridgeData;
      let privateKey: string | undefined = messageData?.privateKey;

      // Get private key from bridge wallet number if not provided
      if (!privateKey) {
        const text = message.content?.text || "";
        const walletNumberMatch = text.match(/(?:bridge\s+wallet\s*)?(\d+)/i);
        if (walletNumberMatch) {
          const walletNumber = parseInt(walletNumberMatch[1], 10);
          if (walletNumber === 1)
            privateKey =
              "0xc262dcd2ca2bb3f42084b71aef883aab080862503cc1bd3add9967c318e31bb9";
          else if (walletNumber === 2)
            privateKey =
              "0x9168d38bf135bcf1fdf0512d7c4479340597615a5c15e9488c79df9946469a22";
          else if (walletNumber === 3)
            privateKey =
              "0xe0049f43a0ea174743e52c37cd04c8b7db122ae301d2169115d1852af6500c1a";
        }
      }

      if (!privateKey) {
        throw new Error(
          "Please specify which bridge wallet to check. Example: 'Check bridge balances for bridge wallet 1'"
        );
      }

      const service = runtime.getService(
        BridgeService.serviceType
      ) as BridgeService;
      if (!service) {
        throw new Error("Bridge service not found");
      }

      const result = await service.getBridgeBalances(privateKey);
      if (!result.success) {
        throw new Error(result.error || "Failed to get bridge balances");
      }

      const balanceData = result.data;

      const responseContent: Content = {
        text:
          `💰 **Cross-Chain MNT Balances**\n\n` +
          `🌐 **Ethereum Network:**\n` +
          `📍 **Address:** ${balanceData?.ethereumAddress}\n` +
          `💵 **MNT Balance:** ${balanceData?.ethereumBalance} MNT\n` +
          `⛽ **ETH Balance:** ${balanceData?.ethereumEthBalance} ETH\n\n` +
          `🌐 **Mantle Network:**\n` +
          `📍 **Address:** ${balanceData?.mantleAddress}\n` +
          `💵 **MNT Balance:** ${balanceData?.mantleBalance} MNT\n` +
          `⛽ **Native MNT:** ${balanceData?.mantleMntBalance} MNT\n\n` +
          `💡 **Bridge Operations:**\n` +
          `• "Bridge 10 MNT from bridge wallet 1 to Ethereum"\n` +
          `• "Bridge 5 MNT from Ethereum to bridge wallet 1"\n` +
          `• "Check bridge status for 0x..."`,
        source: message.content?.source || "user",
        data: balanceData,
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
      logger.error("Error in getBridgeBalancesAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorContent: Content = {
        text:
          `❌ **Failed to get balances:** ${errorMessage}\n\n` +
          `💡 **How to check bridge balances:**\n` +
          `• "Check bridge balances for bridge wallet 1"\n` +
          `• "Show MNT balances on both networks"\n` +
          `• "What are my cross-chain balances?"`,
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
          text: "Check bridge balances for bridge wallet 1",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: '💰 **Cross-Chain MNT Balances**\n\n🌐 **Ethereum Network:**\n📍 **Address:** 0x...\n💵 **MNT Balance:** 10.5 MNT\n⛽ **ETH Balance:** 0.1 ETH\n\n🌐 **Mantle Network:**\n📍 **Address:** 0x...\n💵 **MNT Balance:** 25.3 MNT\n⛽ **Native MNT:** 0.05 MNT\n\n💡 **Bridge Operations:**\n• "Bridge 10 MNT from bridge wallet 1 to Ethereum"\n• "Bridge 5 MNT from Ethereum to bridge wallet 1"\n• "Check bridge status for 0x..."',
        },
      },
    ],
  ],
};
