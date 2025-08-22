import { logger } from "@elizaos/core";
import { MANTLE_SEPOLIA_CONFIG } from "./configs/network";
import {
  createSmartAccountClient,
  type SmartAccountClient,
} from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  createPublicClient,
  http,
  parseEther,
  formatEther,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import {
  generatePrivateKey,
  privateKeyToAccount,
  type PrivateKeyAccount,
} from "viem/accounts";
import { toSafeSmartAccount } from "permissionless/accounts";
import { entryPoint07Address } from "viem/account-abstraction";

export async function generatePimlicoWallet() {
  const config = MANTLE_SEPOLIA_CONFIG;

  try {
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.chain.rpcUrls.default.http[0]),
    });

    const privateKey = generatePrivateKey();
    const owner = privateKeyToAccount(privateKey);

    const pimlicoClient = createPimlicoClient({
      transport: http(config.bundlerUrl),
      entryPoint: {
        address: config.entryPointAddress as Address,
        version: "0.7",
      },
    });

    const smartAccount = await toSafeSmartAccount({
      client: publicClient,
      owners: [owner],
      entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
      },
      version: "1.4.1",
    });

    const smartAccountClient = createSmartAccountClient({
      account: smartAccount,
      chain: config.chain,
      bundlerTransport: http(config.bundlerUrl),
      paymaster: pimlicoClient,
      userOperation: {
        estimateFeesPerGas: async () => {
          return (await pimlicoClient.getUserOperationGasPrice()).fast;
        },
      }, 
    }); 

    return {
      smartAddress: smartAccount.address,
      chainId: config.chain.id,
      chainName: config.chain.name,
      eoa: {
        address: owner.address,
        privateKey: privateKey,
      },
      smartAccount,
      smartAccountClient,
      publicClient,
    };
  } catch (error) {
    logger.error("Error creating Pimlico wallet:", error);
    throw new Error(
      `Failed to create Pimlico wallet: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function createSmartAccountFromPrivateKey(privateKey: string) {
  const config = MANTLE_SEPOLIA_CONFIG;

  try {
    if (!privateKey) {
      throw new Error("Private key is required"); 
    }

    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.chain.rpcUrls.default.http[0]),
    });

    const formattedPrivateKey = privateKey.startsWith("0x")
      ? privateKey
      : `0x${privateKey}`;

    // Validate private key format
    if (!/^0x[a-fA-F0-9]{64}$/.test(formattedPrivateKey)) {
      throw new Error("Invalid private key format");
    }

    const owner = privateKeyToAccount(formattedPrivateKey as Hex);

    const pimlicoClient = createPimlicoClient({
      transport: http(config.bundlerUrl),
      entryPoint: {
        address: config.entryPointAddress as Address,
        version: "0.7",
      },
    });

    const smartAccount = await toSafeSmartAccount({
      client: publicClient,
      owners: [owner],
      entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
      },
      version: "1.4.1",
    });

    const smartAccountClient = createSmartAccountClient({
      account: smartAccount,
      chain: config.chain,
      bundlerTransport: http(config.bundlerUrl),
      paymaster: pimlicoClient,
      userOperation: {
        estimateFeesPerGas: async () => {
          return (await pimlicoClient.getUserOperationGasPrice()).fast;
        },
      },
    });

    return {
      smartAddress: smartAccount.address,
      chainId: config.chain.id,
      chainName: config.chain.name,
      eoa: {
        address: owner.address,
        privateKey: formattedPrivateKey,
      },
      smartAccount,
      smartAccountClient,
      publicClient,
    };
  } catch (error) {
    logger.error("Error creating Pimlico wallet from private key:", error);
    throw new Error(
      `Failed to create Pimlico wallet from private key: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function sendGaslessTransaction(
  smartAccountClient: SmartAccountClient,
  to: string,
  amount: string
) {
  try {
    // Validate inputs
    if (!to || !to.startsWith("0x") || to.length !== 42) {
      throw new Error(`Invalid recipient address: ${to}`);
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    logger.info(`Sending ${amount} MNT to ${to}`);

    if (!smartAccountClient.account) {
      throw new Error("Smart account not initialized");
    }

    const txHash = await smartAccountClient.sendUserOperation({
      calls: [
        {
          to: to as Address,
          value: parseEther(amount),
          data: "0x" as Hex,
        },
      ],
    });

    logger.info(`Transaction sent successfully: ${txHash}`);

    return {
      success: true,
      transactionHash: txHash,
      to: to,
      amount: amount,
    };
  } catch (error) {
    logger.error("Error sending gasless transaction:", error);
    throw new Error(
      `Failed to send gasless transaction: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function batchTransactions(
  smartAccountClient: SmartAccountClient,
  transactions: Array<{ to: string; amount: string }>,
  useGasless: boolean = true
) {
  try {
    if (!transactions || transactions.length === 0) {
      throw new Error("No transactions provided");
    }

    // Validate all transactions
    for (const tx of transactions) {
      if (!tx.to || !tx.to.startsWith("0x") || tx.to.length !== 42) {
        throw new Error(`Invalid recipient address: ${tx.to}`);
      }

      const numAmount = parseFloat(tx.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error(`Invalid amount: ${tx.amount}`);
      }
    }

    logger.info(`Batching ${transactions.length} transactions`);

    const calls = transactions.map((tx) => ({
      to: tx.to as Address,
      value: parseEther(tx.amount),
      data: "0x" as Hex,
    }));

    const txHash = await smartAccountClient.sendUserOperation({
      calls,
    });

    // Wait for the transaction receipt
    const receipt = await smartAccountClient.waitForUserOperationReceipt({
      hash: txHash,
      timeout: 120000, // 2 minutes timeout
    });

    logger.info(`Batch transaction sent successfully: ${txHash}`);

    return {
      success: true,
      transactionHash: txHash,
      transactions: transactions,
      receipt,
    };
  } catch (error) {
    logger.error("Error batching transactions:", error);
    throw new Error(
      `Failed to batch transactions: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function sendTransactionWithData(
  smartAccountClient: SmartAccountClient,
  to: string,
  amount: string,
  data: Hex
) {
  try {
    if (!to || !to.startsWith("0x") || to.length !== 42) {
      throw new Error(`Invalid recipient address: ${to}`);
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    logger.info(`Sending transaction with data to ${to}`);

    if (!smartAccountClient.account) {
      throw new Error("Smart account not initialized");
    }

    const txHash = await smartAccountClient.sendUserOperation({
      calls: [
        {
          to: to as Address,
          value: parseEther(amount),
          data,
        },
      ],
    });

    logger.info(`Transaction with data sent successfully: ${txHash}`);

    return {
      success: true,
      transactionHash: txHash,
      to: to,
      amount: amount,
      data: data,
    };
  } catch (error) {
    logger.error("Error sending transaction with data:", error);
    throw new Error(
      `Failed to send transaction with data: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function getAccountBalance(smartAccountAddress: string) {
  const config = MANTLE_SEPOLIA_CONFIG;

  try {
    if (
      !smartAccountAddress ||
      !smartAccountAddress.startsWith("0x") ||
      smartAccountAddress.length !== 42
    ) {
      throw new Error(`Invalid address format: ${smartAccountAddress}`);
    }

    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.chain.rpcUrls.default.http[0]),
    });

    logger.info(`Getting balance for address: ${smartAccountAddress}`);

    const balance = await publicClient.getBalance({
      address: smartAccountAddress as Address,
    });

    return {
      success: true,
      address: smartAccountAddress,
      balanceWei: balance.toString(),
      balanceEth: formatEther(balance),
      chainId: config.chain.id,
      chainName: config.chain.name,
    };
  } catch (error) {
    logger.error("Error getting account balance:", error);
    throw new Error(
      `Failed to get account balance: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } 
}
