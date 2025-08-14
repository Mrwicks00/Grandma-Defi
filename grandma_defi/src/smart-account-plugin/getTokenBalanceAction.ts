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
import { createSmartAccountFromPrivateKey } from "./provider";
import { SUPPORTED_TOKENS } from "../portfolio-plugin/config/addresses";

// Define types for message data
interface WalletData {
  privateKey?: string;
  address?: string;
  walletId?: string;
  tokens?: string[];
}

// Standard ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const getTokenBalanceAction: Action = {
  name: "GET_TOKEN_BALANCE",
  similes: [
    "CHECK_TOKEN_BALANCE",
    "TOKEN_BALANCE",
    "ERC20_BALANCE",
    "SHOW_TOKEN_BALANCES",
    "MY_TOKEN_BALANCE",
    "ALL_BALANCES",
  ],
  description:
    "Check ERC20 token balances along with native MNT for a smart wallet",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("token") && text.includes("balance");
  },

  handler: async function (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      const service = runtime.getService(
        PimlicoWalletService.serviceType
      ) as PimlicoWalletService;
      if (!service) {
        throw new Error("Pimlico wallet service not found");
      }

      const messageData = message.content?.data as WalletData;
      const text = message.content?.text || "";
      let address: string | undefined = messageData?.address;

      // Try to extract address or wallet number from text
      if (!address) {
        const addressMatch = text.match(/0x[a-fA-F0-9]{40}/i);
        if (addressMatch) {
          address = addressMatch[0];
        } else {
          // Check for wallet number references
          const walletNumberMatch = text.match(/wallet\s*(\d+)/i);
          if (walletNumberMatch) {
            const walletNumber = parseInt(walletNumberMatch[1], 10);
            const walletId = `wallet-${walletNumber}`;

            // Try to get wallet by ID
            const walletResult = await service.getWalletById(walletId);
            if (walletResult.success && walletResult.data) {
              address =
                walletResult.data.smartAddress || walletResult.data.eoaAddress;
            }
          }
        }
      }

      if (!address) {
        throw new Error(
          "Please specify a wallet address (0x...) or wallet number (e.g., 'wallet 1')"
        );
      }

      // Get native MNT balance
      const nativeBalanceResult = await service.getBalance(address);
      if (!nativeBalanceResult.success) {
        throw new Error("Failed to get native balance");
      }

      const nativeBalance = nativeBalanceResult.data!;

      // Get smart account client for ERC20 calls
      let publicClient;
      try {
        // Try to get the private key to create a client
        const walletMatch = text.match(/wallet\s*(\d+)/i);
        if (walletMatch) {
          const walletNumber = parseInt(walletMatch[1], 10);
          const walletId = `wallet-${walletNumber}`;
          const walletResult = await service.getWalletById(walletId);
          if (walletResult.success && walletResult.data) {
            const { publicClient: client } =
              await createSmartAccountFromPrivateKey(
                walletResult.data.privateKey
              );
            publicClient = client;
          }
        }
      } catch (error) {
        logger.warn("Could not get public client, will skip ERC20 balances");
      }

      let tokenBalances: Array<{
        symbol: string;
        balance: string;
        address: string;
      }> = [];

      // Get ERC20 token balances
      if (publicClient) {
        for (const token of SUPPORTED_TOKENS) {
          // Skip native MNT (address 0x0...)
          if (token.address === "0x0000000000000000000000000000000000000000") {
            continue;
          }

          try {
            const balance = await publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            });

            // Convert balance from wei to readable format
            const decimals = token.decimals;
            const balanceFormatted = (
              Number(balance) / Math.pow(10, decimals)
            ).toFixed(6);

            tokenBalances.push({
              symbol: token.symbol,
              balance: balanceFormatted,
              address: token.address,
            });
          } catch (error) {
            logger.warn(`Failed to get balance for ${token.symbol}:`, error); 
            tokenBalances.push({
              symbol: token.symbol,
              balance: "Error",
              address: token.address,
            });
          }
        }
      }

      // Format the response
      const nativeBalanceFormatted = parseFloat(
        nativeBalance.balanceEth
      ).toFixed(6);

      let tokenBalanceText = "";
      if (tokenBalances.length > 0) {
        tokenBalanceText = tokenBalances
          .map((token) => {
            const balanceNum = parseFloat(token.balance);
            const status = balanceNum > 0 ? "💰" : "💸";
            return `${status} **${token.symbol}:** ${token.balance}`;
          })
          .join("\n");
      } else {
        tokenBalanceText = "⚠️ Could not fetch ERC20 token balances";
      }

      const responseContent: Content = {
        text:
          `💰 **Complete Token Balance Report**\n\n` +
          `📍 **Address:** ${address.slice(0, 6)}...${address.slice(-4)}\n` +
          `🌐 **Network:** ${nativeBalance.chainName}\n\n` +
          `**Native Token:**\n` +
          `🏛️ **MNT:** ${nativeBalanceFormatted}\n\n` +
          `**ERC20 Tokens:**\n` +
          `${tokenBalanceText}\n\n` +
          `${parseFloat(nativeBalanceFormatted) > 0.001 ? "✅ **Ready for DeFi!** 🚀" : "⚠️ **Low MNT balance.** Get testnet tokens: https://faucet.sepolia.mantle.xyz/ 💧"}\n\n` +
          `💡 **Portfolio Tips:**\n` +
          `• Create a balanced portfolio: "Create portfolio with 1 MNT from wallet 1"\n` +
          `• Check portfolio status: "Get my portfolios from wallet 1"`,
        source: message.content?.source || "user",
        data: {
          address,
          nativeBalance: {
            symbol: "MNT",
            balance: nativeBalanceFormatted,
            balanceWei: nativeBalance.balanceWei,
          },
          tokenBalances,
          chainId: nativeBalance.chainId,
          chainName: nativeBalance.chainName,
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
      logger.error("Error in getTokenBalanceAction:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const errorContent: Content = {
        text: `❌ **Couldn't check token balances:** ${errorMessage}\n\n💡 **Try:** "Check token balance for wallet 1"`,
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
          text: "Check token balance for wallet 1",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: '💰 **Complete Token Balance Report**\n\n📍 **Address:** 0x1fE0...80C\n🌐 **Network:** Mantle Sepolia Testnet\n\n**Native Token:**\n🏛️ **MNT:** 1.500000\n\n**ERC20 Tokens:**\n💸 **wETH:** 0.000000\n💸 **wBTC:** 0.000000\n💸 **USDT:** 0.000000\n💸 **GRANDMA:** 0.000000\n\n✅ **Ready for DeFi!** 🚀\n\n💡 **Portfolio Tips:**\n• Create a balanced portfolio: "Create portfolio with 1 MNT from wallet 1"\n• Check portfolio status: "Get my portfolios from wallet 1"',
        },
      },
    ],
  ],
};
