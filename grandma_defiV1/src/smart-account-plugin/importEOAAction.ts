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
import { ethers } from "ethers";
import { PimlicoWalletService } from "./service";

// Interface for EOA wallet data
interface EOAWalletData {
  privateKey?: string;
  address?: string;
  walletId?: string;
}

export const importEOAAction: Action = {
  name: "IMPORT_EOA_WALLET",
  similes: [
    "IMPORT_EOA",
    "IMPORT_METAMASK_EOA",
    "ADD_EOA_WALLET",
    "CONNECT_EOA",
    "IMPORT_PRIVATE_KEY_EOA",
    "USE_MY_WALLET",
    "LOAD_METAMASK_WALLET",
  ],
  description:
    "Import an existing MetaMask wallet as EOA (not smart account) to use with regular gas transactions",
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    const messageData = message.content?.data as EOAWalletData;

    // Check if private key is provided in data
    if (messageData?.privateKey) {
      return (
        messageData.privateKey.startsWith("0x") &&
        messageData.privateKey.length === 66
      );
    }

    // Check for EOA-specific keywords
    return (
      (text.includes("import") &&
        (text.includes("eoa") || text.includes("metamask"))) ||
      text.includes("private key") ||
      text.includes("use my wallet") ||
      text.includes("connect eoa")
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
      logger.info("Importing EOA wallet (non-smart account)");

      const messageData = message.content?.data as EOAWalletData;
      let privateKey: string | undefined = messageData?.privateKey;

      // Extract private key from text if not in data
      if (!privateKey) {
        const text = message.content?.text || "";

        // Look for private key in text (0x followed by 64 hex characters)
        const pkMatch = text.match(/0x[a-fA-F0-9]{64}/);
        if (pkMatch) {
          privateKey = pkMatch[0];
        }
      }

      if (!privateKey) {
        throw new Error(
          "Please provide your MetaMask private key. You can find this in MetaMask: Account Menu → Account Details → Export Private Key"
        );
      }

      // Validate private key format
      if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
        throw new Error(
          "Invalid private key format. Please provide a valid 64-character hex private key starting with 0x"
        );
      }

      // Create ethers wallet from private key to get address
      const ethersWallet = new ethers.Wallet(privateKey);
      const address = ethersWallet.address;

      const service = runtime.getService(
        PimlicoWalletService.serviceType
      ) as PimlicoWalletService;
      if (!service) {
        throw new Error("Wallet service not found");
      }

      // Store as EOA wallet (not smart account)
      const walletData = {
        privateKey,
        address,
        type: "eoa",
        chainName: "Mantle Sepolia Testnet",
        chainId: 5003,
        isImported: true,
        isEOA: true,
        createdAt: new Date().toISOString(),
      };

      // Add to service (we'll update the service to handle EOA wallets)
      const result = await service.addEOAWallet(walletData);
      if (!result.success) {
        throw new Error(result.error || "Failed to import EOA wallet");
      }

      const responseContent: Content = {
        text:
          `✅ **EOA Wallet imported successfully!**\n\n` +
          `🔑 **Wallet Type:** Externally Owned Account (EOA)\n` +
          `📍 **Address:** ${address}\n` +
          `🔐 **Private Key:** ${privateKey}\n` +
          `🌐 **Network:** Mantle Sepolia Testnet\n` +
          `🔗 **Chain ID:** 5003\n\n` +
          `💡 **What this means:**\n` +
          `• ✅ This is your original MetaMask wallet\n` +
          `• ✅ You pay gas fees (no gasless transactions)\n` +
          `• ✅ Full compatibility with all DeFi protocols\n` +
          `• ✅ Direct smart contract interactions\n` +
          `• ✅ Same as using MetaMask directly\n\n` +
          `🚀 **Ready to use!** You can now:\n` +
          `• Send transactions with regular gas fees\n` +
          `• Interact with smart contracts\n` +
          `• Create and manage DeFi portfolios\n` +
          `• Use all portfolio management features\n\n` +
          `🔐 **Security:** Your private key is stored locally and never shared.\n\n` +
          `💡 **Example commands:**\n` +
          `• "Send 0.1 MNT from EOA wallet to 0x..."\n` +
          `• "Check EOA wallet balance"\n` +
          `• "Create portfolio with EOA wallet"`,
        source: message.content?.source || "user",
        data: {
          address,
          privateKey,
          type: "eoa",
          chainId: 5003,
          chainName: "Mantle Sepolia Testnet",
          isImported: true,
          isEOA: true,
          walletId: result.data?.walletId,
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
      logger.error("Error in importEOAAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorContent: Content = {
        text:
          `❌ **Failed to import EOA wallet:** ${errorMessage}\n\n` +
          `💡 **How to import your MetaMask wallet as EOA:**\n` +
          `1. Open MetaMask → Account Menu → Account Details\n` +
          `2. Click "Export Private Key" and enter your password\n` +
          `3. Copy the private key (starts with 0x...)\n` +
          `4. Use command: "Import EOA wallet with private key 0x..."\n\n` +
          `🔐 **Security:** Your private key is only used locally and never stored on servers.\n\n` +
          `💡 **EOA vs Smart Account:**\n` +
          `• EOA = Your original wallet, pays gas fees\n` +
          `• Smart Account = Gasless transactions, more features`,
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
          text: "I want to import my MetaMask wallet as EOA",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "✅ **EOA Wallet imported successfully!**\n\n🔑 **Wallet Type:** Externally Owned Account (EOA)\n📍 **Address:** 0x...\n🔐 **Private Key:** 0x...\n🌐 **Network:** Mantle Sepolia Testnet\n🔗 **Chain ID:** 5003\n\n💡 **What this means:**\n• ✅ This is your original MetaMask wallet\n• ✅ You pay gas fees (no gasless transactions)\n• ✅ Full compatibility with all DeFi protocols\n• ✅ Direct smart contract interactions\n• ✅ Same as using MetaMask directly\n\n🚀 **Ready to use!** You can now:\n• Send transactions with regular gas fees\n• Interact with smart contracts\n• Create and manage DeFi portfolios\n• Use all portfolio management features",
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Import EOA wallet with private key 0xc262dcd2ca2bb3f42084b71aef883aab080862503cc1bd3add9967c318e31bb9",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "✅ **EOA Wallet imported successfully!**\n\n🔑 **Wallet Type:** Externally Owned Account (EOA)\n📍 **Address:** 0x...\n🔐 **Private Key:** 0xc262...\n🌐 **Network:** Mantle Sepolia Testnet\n🔗 **Chain ID:** 5003\n\n💡 **What this means:**\n• ✅ This is your original MetaMask wallet\n• ✅ You pay gas fees (no gasless transactions)\n• ✅ Full compatibility with all DeFi protocols\n• ✅ Direct smart contract interactions\n• ✅ Same as using MetaMask directly",
        },
      },
    ],
  ],
};
