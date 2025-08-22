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
import { ethers, TypedDataDomain, TypedDataField } from "ethers";
import { PimlicoWalletService } from "./service";
import { OrbyProvider } from "@orb-labs/orby-ethers6";
import {
  Activity,
  ActivityStatus, 
  OnchainOperation,
  OperationType,
} from "@orb-labs/orby-core";

interface EOATransactionData {
  privateKey?: string;
  to?: string;
  amount?: string;
  walletId?: string;
  address?: string;
}

// EOA Send Transaction Action (with gas fees)
export const sendEOATransactionAction: Action = {
  name: "SEND_EOA_TRANSACTION",
  similes: [
    "SEND_EOA",
    "EOA_SEND",
    "SEND_WITH_GAS",
    "EOA_TRANSFER",
    "METAMASK_SEND",
    "SEND_FROM_EOA",
  ],
  description:
    "Send a transaction from EOA wallet (pays gas fees, like MetaMask)",
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return (
      text.includes("send") &&
      (text.includes("eoa") ||
        text.includes("metamask") ||
        text.includes("gas") ||
        text.includes("from eoa"))
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
      logger.info("Sending EOA transaction with gas fees");

      const service = runtime.getService(
        PimlicoWalletService.serviceType
      ) as PimlicoWalletService;
      if (!service) {
        throw new Error("Wallet service not found");
      }

      const messageData = message.content?.data as EOATransactionData;
      let privateKey: string | undefined = messageData?.privateKey;
      let to: string | undefined = messageData?.to;
      let amount: string | undefined = messageData?.amount;

      // Parse from text
      const text = message.content?.text || "";

      // Extract recipient address
      const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
      if (addressMatch) to = addressMatch[0];

      // Extract amount
      const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:MNT|ETH|mnt|eth)?/i);
      if (amountMatch) amount = amountMatch[1];

      // Try to get wallet by number (unified system)
      const walletMatch = text.match(
        /(?:from\s+)?(?:eoa\s+)?(?:metamask\s+)?wallet\s*(\d+)/i
      );

      if (walletMatch && !privateKey) {
        const walletNumber = parseInt(walletMatch[1]);
        const walletId = `wallet-${walletNumber}`;

        const walletResult = await service.getWalletById(walletId);
        if (
          walletResult.success &&
          walletResult.data &&
          walletResult.data.type === "eoa"
        ) {
          privateKey = walletResult.data.privateKey;
        }
      }

      if (!to || !amount || !privateKey) {
        throw new Error(
          'Please specify recipient, amount, and EOA wallet. Example: "Send 0.1 MNT from EOA wallet to 0x1234..."'
        );
      }

      // Validate inputs
      if (!to.startsWith("0x") || to.length !== 42) {
        throw new Error("Invalid recipient address format");
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Invalid amount");
      }

      const wallet = new ethers.Wallet(privateKey);
      const { virtualNodeProvider, accountCluster } = await service.orbySetup(
        process.env.ORBY_PRIVATE_INSTANCE_URL!,
        BigInt(5003),
        wallet.address
      );

      const portfolio = await virtualNodeProvider.getFungibleTokenPortfolio(
        accountCluster.accountClusterId
      );

      if (!portfolio) {
        throw new Error("failed to get fungible token portfolio");
      }

      // find token where balance is more than 50c
      const firstNotableBalance = portfolio.find(
        (balance) => balance.total.fiatValue().toRawAmount() >= 500000
      );

      const response =
        await virtualNodeProvider.getOperationsToExecuteTransaction(
          accountCluster.accountClusterId, // accountClusterId
          "0x", // data
          to, // to
          ethers.parseEther(amount), // value
          firstNotableBalance
            ? { standardizedTokenId: firstNotableBalance.standardizedTokenId }
            : undefined
        );

      // callback to sign transactions
      const signTransaction = async (
        operation: OnchainOperation
      ): Promise<string | undefined> => {
        const virtualNodeProvider = new OrbyProvider(operation.txRpcUrl);
        const wallet = new ethers.Wallet(privateKey, virtualNodeProvider);

        const {
          from,
          to,
          data,
          gasPrice,
          maxPriorityFeePerGas,
          maxFeePerGas,
          gasLimit,
          value,
          nonce,
          chainId,
        } = operation;

        const txData = {
          from,
          to,
          value,
          data,
          nonce: Number(nonce),
          gasLimit,
          chainId,
          gasPrice,
          maxFeePerGas,
          maxPriorityFeePerGas,
        };

        return await wallet.signTransaction(txData);
      };

      // callback to sign typeddata
      const signTypedData = async (
        operation: OnchainOperation
      ): Promise<string | undefined> => {
        const virtualNodeProvider = new OrbyProvider(operation.txRpcUrl);
        const wallet = new ethers.Wallet(privateKey, virtualNodeProvider);

        const parsedData = JSON.parse(operation.data) as {
          domain: TypedDataDomain;
          types: Record<string, Array<TypedDataField>>;
          message: Record<string, any>;
        };
        delete parsedData.types["EIP712Domain"];

        return await wallet.signTypedData(
          parsedData.domain,
          parsedData.types,
          parsedData.message
        );
      };

      // callback for operations
      const onOperationSetStatusUpdateCallback = async (
        activity?: Activity
      ): Promise<void> => {
        if (!activity) {
          // TODO(Adeoba): handle this case
        } else if (
          [ActivityStatus.SUCCESSFUL, ActivityStatus.PENDING].includes(
            activity?.overallStatus
          )
        ) {
          const finalOperation = activity.operationStatuses.find(
            (status) => status.type == OperationType.FINAL_TRANSACTION
          );

          if (!finalOperation) {
            // TODO(Adeoba): handle this case
          }

          const receipt = await virtualNodeProvider.getTransactionReceipt(
            finalOperation?.hash!
          );

          const responseContent: Content = {
            text:
              `✅ **EOA Transaction completed successfully!**\n\n` +
              `💸 **Amount:** ${amount} MNT\n` +
              `📍 **To:** ${to}\n` +
              `📍 **From:** ${wallet.address}\n` +
              `⛽ **Gas Used:** ${receipt?.gasUsed.toString()}\n` +
              `💰 **Gas Cost:** ~${activity?.gasTokenAmount?.toSignificant(6)} MNT\n` +
              `🧾 **Transaction Hash:** ${finalOperation?.hash}\n` +
              `🔗 **Explorer:** https://sepolia.mantlescan.xyz/tx/${finalOperation?.hash}\n\n` +
              `💡 **This was a regular transaction (like MetaMask):**\n` +
              `• ✅ You paid gas fees directly\n` +
              `• ✅ Transaction is immediately on-chain\n` +
              `• ✅ Works with all DeFi protocols\n\n` +
              `🎉 Recipient will receive ${amount} MNT once confirmed!`,
            source: message.content?.source || "user",
            data: {
              transactionHash: finalOperation?.hash,
              to,
              amount,
              from: wallet.address,
              gasUsed: receipt?.gasUsed.toString(),
              gasCost: activity.gasTokenAmount?.toRawAmount(),
              explorerUrl: `https://sepolia.mantlescan.xyz/tx/${finalOperation?.hash}`,
              type: "eoa_transaction",
            },
          };

          if (callback) {
            await callback(responseContent);
          }
        } else if (
          [ActivityStatus.FAILED, ActivityStatus.NOT_FOUND].includes(
            activity?.overallStatus
          )
        ) {
          // TODO(Adeoba): handle this case
        }
      };

      const sendResponse = await virtualNodeProvider.sendOperationSet(
        accountCluster,
        response,
        signTransaction, // signTransaction
        undefined, // signUserOperation
        signTypedData // signTypedData
      );

      if (!sendResponse) {
        throw new Error("failed to send operation set");
      }

      // Subscribe to operation set status updates
      const subscriptionKey =
        virtualNodeProvider?.subscribeToOperationSetStatus(
          sendResponse.operationSetId,
          onOperationSetStatusUpdateCallback
        );

      // TODO(Adeoba): make sure this is what you want
      return createActionResult({
        text: "Processing ...",
        data: subscriptionKey as Record<string, any>,
        success: true,
      });
    } catch (error) {
      logger.error("Error in sendEOATransactionAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorContent: Content = {
        text:
          `❌ **EOA Transaction failed:** ${errorMessage}\n\n` +
          `💡 **How to send from EOA wallet:**\n` +
          `1. First import your wallet: "Import EOA wallet with private key 0x..."\n` +
          `2. Then send: "Send 0.1 MNT from EOA wallet to 0x..."\n` +
          `3. Make sure you have sufficient MNT for gas fees\n\n` +
          `⛽ **Gas fees:** EOA transactions require MNT for gas (unlike gasless smart accounts)`,
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
          text: "Send 0.1 MNT from EOA wallet to 0x40817a62f10068332704cDC3b827EFE588AA8f0D",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "✅ **EOA Transaction completed successfully!**\n\n💸 **Amount:** 0.1 MNT\n📍 **To:** 0x40817a62f10068332704cDC3b827EFE588AA8f0D\n📍 **From:** 0x...\n⛽ **Gas Used:** 21000\n💰 **Gas Cost:** ~0.000420 MNT\n🧾 **Transaction Hash:** 0xabc123...\n🔗 **Explorer:** https://sepolia.mantlescan.xyz/tx/0xabc123...\n\n💡 **This was a regular transaction (like MetaMask):**\n• ✅ You paid gas fees directly\n• ✅ Transaction is immediately on-chain\n• ✅ Works with all DeFi protocols\n\n🎉 Recipient will receive 0.1 MNT once confirmed!",
        },
      },
    ],
  ],
};

// EOA Balance Check Action
export const checkEOABalanceAction: Action = {
  name: "CHECK_EOA_BALANCE",
  similes: [
    "EOA_BALANCE",
    "CHECK_EOA",
    "METAMASK_BALANCE",
    "EOA_WALLET_BALANCE",
  ],
  description: "Check the balance of an EOA wallet",
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return (
      text.includes("balance") &&
      (text.includes("eoa") || text.includes("metamask"))
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
      logger.info("Checking EOA wallet balance");

      const service = runtime.getService(
        PimlicoWalletService.serviceType
      ) as PimlicoWalletService;
      if (!service) {
        throw new Error("Wallet service not found");
      }

      const text = message.content?.text || "";
      let address: string | undefined;

      // Try to get wallet by number (unified system)
      const walletMatch = text.match(
        /(?:eoa\s+)?(?:metamask\s+)?wallet\s*(\d+)/i
      );

      if (walletMatch) {
        const walletNumber = parseInt(walletMatch[1]);
        const walletId = `wallet-${walletNumber}`;

        const walletResult = await service.getWalletById(walletId);
        if (
          walletResult.success &&
          walletResult.data &&
          walletResult.data.type === "eoa"
        ) {
          address = walletResult.data.eoaAddress;
        }
      }

      // Try to extract address directly
      if (!address) {
        const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
          address = addressMatch[0];
        }
      }

      if (!address) {
        throw new Error(
          "Please specify EOA wallet. Example: 'Check EOA wallet balance' or 'Check balance of 0x...'"
        );
      }

      const { virtualNodeProvider } = await service.orbySetup(
        process.env.ORBY_PRIVATE_INSTANCE_URL!,
        BigInt(5003),
        address
      );

      const balance = await virtualNodeProvider.getBalance(address);
      const balanceEth = ethers.formatEther(balance);

      const responseContent: Content = {
        text:
          `💰 **EOA Wallet Balance:**\n\n` +
          `📍 **Address:** ${address}\n` +
          `💵 **Balance:** ${parseFloat(balanceEth).toFixed(4)} MNT\n` +
          `🔑 **Wallet Type:** Externally Owned Account (EOA)\n` +
          `🌐 **Network:** Mantle Sepolia Testnet\n` +
          `🔗 **Chain ID:** 5003\n\n` +
          `${
            parseFloat(balanceEth) > 0.01
              ? "✅ **Ready to transact!** 🚀"
              : "⚠️ **Low balance detected.** Get testnet MNT from: https://faucet.sepolia.mantle.xyz/ 💧"
          }\n\n` +
          `💡 **EOA Wallet Features:**\n` +
          `• ⛽ Pays gas fees for transactions\n` +
          `• 🔗 Direct smart contract interaction\n` +
          `• 💯 Full DeFi protocol compatibility\n` +
          `• 🦊 Same as using MetaMask`,
        source: message.content?.source || "user",
        data: {
          address,
          balance: balance.toString(),
          balanceEth,
          chainId: 5003,
          chainName: "Mantle Sepolia Testnet",
          type: "eoa",
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
      logger.error("Error in checkEOABalanceAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorContent: Content = {
        text:
          `❌ **Failed to check EOA balance:** ${errorMessage}\n\n` +
          `💡 **How to check EOA wallet balance:**\n` +
          `• "Check EOA wallet balance"\n` +
          `• "Check balance of 0x1234..."\n` +
          `• First import: "Import EOA wallet with private key 0x..."`,
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
          text: "Check EOA wallet balance",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "💰 **EOA Wallet Balance:**\n\n📍 **Address:** 0x...\n💵 **Balance:** 0.1000 MNT\n🔑 **Wallet Type:** Externally Owned Account (EOA)\n🌐 **Network:** Mantle Sepolia Testnet\n🔗 **Chain ID:** 5003\n\n✅ **Ready to transact!** 🚀\n\n💡 **EOA Wallet Features:**\n• ⛽ Pays gas fees for transactions\n• 🔗 Direct smart contract interaction\n• 💯 Full DeFi protocol compatibility\n• 🦊 Same as using MetaMask",
        },
      },
    ],
  ],
};
