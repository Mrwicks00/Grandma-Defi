import { type IAgentRuntime, logger, Service } from "@elizaos/core";

import {
  generatePimlicoWallet,
  createSmartAccountFromPrivateKey,
  sendGaslessTransaction,
  batchTransactions,
  sendTransactionWithData,
  getAccountBalance,
} from "./provider";

// Define wallet types
interface StoredWallet {
  id: string;
  name: string;
  type: "smart_account" | "eoa";
  privateKey: string;
  smartAddress?: string;
  eoaAddress: string;
  chainId: string;
  chainName: string;
  isDeployed: boolean;
  createdAt: Date;
  isImported: boolean;
}

export class PimlicoWalletService extends Service {
  static serviceType = "pimlico_wallet";

  capabilityDescription =
    "This plugin enables ERC-4337 wallet creation and management via Pimlico on Mantle Sepolia network";

  private wallets: Map<string, StoredWallet> = new Map();
  private walletCounter: number = 0;
  private lastWalletCreation: number = 0;
  private readonly WALLET_CREATION_COOLDOWN = 5000; // 5 seconds cooldown

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    // Start with clean slate - no hardcoded wallets
    logger.info(
      "🚀 Wallet service initialized - ready to create or import wallets"
    );
  }

  private generateWalletId(): string {
    this.walletCounter++;
    return `wallet-${this.walletCounter}`;
  }

  private addWallet(
    walletData: any,
    isImported: boolean = false
  ): StoredWallet {
    const walletId = this.generateWalletId();
    const wallet: StoredWallet = {
      id: walletId,
      name: `Wallet ${this.walletCounter}`,
      type: "smart_account",
      privateKey: walletData.privateKey || walletData.eoa.privateKey,
      smartAddress: walletData.smartAddress,
      eoaAddress: walletData.eoaAddress || walletData.eoa.address,
      chainId: walletData.chainId.toString(),
      chainName: walletData.chainName,
      isDeployed: false,
      createdAt: new Date(),
      isImported,
    };

    this.wallets.set(walletId, wallet);
    logger.info(`Added new wallet: ${wallet.name} (${walletId})`);
    return wallet;
  }

  static async start(runtime: IAgentRuntime): Promise<PimlicoWalletService> {
    logger.info("*** Starting Pimlico wallet service ***");
    return new PimlicoWalletService(runtime);
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(PimlicoWalletService.serviceType);
    if (!service) {
      throw new Error("Pimlico wallet service not found");
    }
    await service.stop();
  }

  async stop(): Promise<void> {
    logger.info("*** Stopping Pimlico wallet service instance ***");
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Test wallet creation to validate configuration
      await generatePimlicoWallet();
      return true;
    } catch (error) {
      logger.error("Configuration validation failed:", error);
      return false;
    }
  }

  async createWallet() {
    try {
      // Check cooldown to prevent rapid wallet creation
      const now = Date.now();
      if (now - this.lastWalletCreation < this.WALLET_CREATION_COOLDOWN) {
        const remainingCooldown = Math.ceil(
          (this.WALLET_CREATION_COOLDOWN - (now - this.lastWalletCreation)) /
            1000
        );
        return {
          success: false,
          error: `Please wait ${remainingCooldown} seconds before creating another wallet. This prevents accidental duplicate wallet creation.`,
        };
      }

      logger.info("Creating new Pimlico wallet on Mantle Sepolia");
      this.lastWalletCreation = now;
      const walletData = await generatePimlicoWallet();

      // Add the new wallet to our storage
      const storedWallet = this.addWallet(walletData, false);

      return {
        success: true,
        data: {
          id: storedWallet.id,
          name: storedWallet.name,
          smartAddress: storedWallet.smartAddress,
          chainId: storedWallet.chainId,
          chainName: storedWallet.chainName,
          privateKey: storedWallet.privateKey,
          eoaAddress: storedWallet.eoaAddress,
          isNewWallet: true,
        },
      };
    } catch (error) {
      logger.error("Error creating wallet:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async loadWallet(privateKey: string) {
    try {
      logger.info("Loading Pimlico wallet from private key");
      const walletData = await createSmartAccountFromPrivateKey(privateKey);

      // Check if wallet already exists
      const existingWallet = Array.from(this.wallets.values()).find(
        (w) =>
          w.privateKey === privateKey || w.eoaAddress === walletData.eoa.address
      );

      if (existingWallet) {
        logger.info(`Wallet already exists: ${existingWallet.name}`);
        return {
          success: true,
          data: {
            id: existingWallet.id,
            name: existingWallet.name,
            smartAddress: existingWallet.smartAddress,
            chainId: existingWallet.chainId,
            chainName: existingWallet.chainName,
            privateKey: existingWallet.privateKey,
            eoaAddress: existingWallet.eoaAddress,
            isNewWallet: false,
          },
        };
      }

      // Add the imported wallet to our storage
      const storedWallet = this.addWallet(walletData, true);

      return {
        success: true,
        data: {
          id: storedWallet.id,
          name: storedWallet.name,
          smartAddress: storedWallet.smartAddress,
          chainId: storedWallet.chainId,
          chainName: storedWallet.chainName,
          privateKey: storedWallet.privateKey,
          eoaAddress: storedWallet.eoaAddress,
          isNewWallet: false,
        },
      };
    } catch (error) {
      logger.error("Error loading wallet:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getBalance(address: string) {
    try {
      logger.info(`Getting balance for address ${address}`);
      const balanceData = await getAccountBalance(address);
      return {
        success: true,
        data: {
          address: balanceData.address,
          balanceWei: balanceData.balanceWei,
          balanceEth: balanceData.balanceEth,
          chainId: balanceData.chainId,
          chainName: balanceData.chainName,
        },
      };
    } catch (error) {
      logger.error("Error getting balance:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendTransaction(privateKey: string, to: string, amount: string) {
    try {
      logger.info(`Sending ${amount} MNT to ${to} via gasless transaction`);
      const { smartAccountClient } =
        await createSmartAccountFromPrivateKey(privateKey);
      const result = await sendGaslessTransaction(
        smartAccountClient,
        to,
        amount
      );

      return {
        success: true,
        data: {
          transactionHash: result.transactionHash,
          to: result.to,
          amount: result.amount,
          message: `Successfully sent ${amount} MNT to ${to}`,
          explorerUrl: `https://sepolia.mantlescan.xyz/tx/${result.transactionHash}`,
        },
      };
    } catch (error) {
      logger.error("Error sending transaction:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async batchTransactions(
    privateKey: string,
    transactions: Array<{ to: string; amount: string }>,
    useGasless: boolean = true
  ) {
    try {
      logger.info(`Batching ${transactions.length} transactions`);
      const { smartAccountClient } =
        await createSmartAccountFromPrivateKey(privateKey);
      const result = await batchTransactions(
        smartAccountClient,
        transactions,
        useGasless
      );

      return {
        success: true,
        data: {
          transactionHash: result.transactionHash,
          message: `Successfully batched ${transactions.length} transactions`,
          transactionCount: transactions.length,
          explorerUrl: `https://sepolia.mantlescan.xyz/tx/${result.transactionHash}`,
        },
      };
    } catch (error) {
      logger.error("Error batching transactions:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendTransactionWithData(
    privateKey: string,
    to: string,
    amount: string,
    data: string
  ) {
    try {
      logger.info(`Sending transaction with custom data to ${to}`);
      const { smartAccountClient } =
        await createSmartAccountFromPrivateKey(privateKey);
      const result = await sendTransactionWithData(
        smartAccountClient,
        to,
        amount,
        data as any
      );

      return {
        success: true,
        data: {
          transactionHash: result.transactionHash,
          message: `Successfully sent transaction with custom data to ${to}`,
          explorerUrl: `https://sepolia.mantlescan.xyz/tx/${result.transactionHash}`,
        },
      };
    } catch (error) {
      logger.error("Error sending transaction with data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getWalletInfo(privateKey: string) {
    try {
      if (!privateKey) {
        throw new Error("Private key is required to retrieve wallet info");
      }

      // First check if we have this wallet in storage
      const existingWallet = Array.from(this.wallets.values()).find(
        (w) => w.privateKey === privateKey
      );

      if (existingWallet) {
        return {
          success: true,
          data: {
            id: existingWallet.id,
            name: existingWallet.name,
            type: existingWallet.type,
            smartAddress: existingWallet.smartAddress,
            eoaAddress: existingWallet.eoaAddress,
            privateKey: existingWallet.privateKey,
            chainId: existingWallet.chainId,
            chainName: existingWallet.chainName,
            isDeployed: existingWallet.isDeployed,
            isImported: existingWallet.isImported,
            createdAt: existingWallet.createdAt,
          },
        };
      }

      // If not in storage, create wallet data from private key
      const walletData = await createSmartAccountFromPrivateKey(privateKey);

      return {
        success: true,
        data: {
          smartAddress: walletData.smartAddress,
          eoaAddress: walletData.eoa.address,
          privateKey: walletData.eoa.privateKey,
          chainId: walletData.chainId,
          chainName: walletData.chainName,
          isDeployed: false, // Smart accounts are counterfactual until first transaction
        },
      };
    } catch (error) {
      logger.error("Error getting wallet info:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getWalletById(walletId: string) {
    try {
      if (!walletId) {
        throw new Error("Wallet ID is required");
      }

      const wallet = this.wallets.get(walletId);
      if (!wallet) {
        // Provide helpful error message with available wallets
        const availableWallets = Array.from(this.wallets.keys());
        const errorMsg =
          availableWallets.length > 0
            ? `Wallet ${walletId} not found. Available wallets: ${availableWallets.join(", ")}`
            : `Wallet ${walletId} not found. No wallets have been created yet. Use "create wallet" to get started.`;
        throw new Error(errorMsg);
      }

      return {
        success: true,
        data: {
          id: wallet.id,
          name: wallet.name,
          type: wallet.type,
          smartAddress: wallet.smartAddress,
          eoaAddress: wallet.eoaAddress,
          privateKey: wallet.privateKey,
          chainId: wallet.chainId,
          chainName: wallet.chainName,
          isDeployed: wallet.isDeployed,
          isImported: wallet.isImported,
          createdAt: wallet.createdAt,
        },
      };
    } catch (error) {
      logger.error("Error getting wallet by ID:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getWalletCount() {
    try {
      logger.info("Getting wallet count and list");

      // Get all stored wallets
      const storedWallets = Array.from(this.wallets.values());

      if (storedWallets.length === 0) {
        return {
          success: true,
          data: {
            totalWallets: 0,
            smartAccountCount: 0,
            eoaCount: 0,
            wallets: [],
            message:
              "You don't have any wallets yet. Create your first wallet to get started!",
          },
        };
      }

      // Group wallets by type and create a clean list
      const walletList = storedWallets.map((wallet, index) => ({
        walletNumber: index + 1,
        id: wallet.id,
        name: wallet.name,
        type: wallet.type,
        privateKey: wallet.privateKey,
        smartAddress: wallet.smartAddress,
        eoaAddress: wallet.eoaAddress,
        chainId: wallet.chainId,
        chainName: wallet.chainName,
        isDeployed: wallet.isDeployed,
        isImported: wallet.isImported,
        createdAt: wallet.createdAt,
      }));

      // Count by type
      const smartAccountCount = storedWallets.filter(
        (w) => w.type === "smart_account"
      ).length;
      const eoaCount = storedWallets.filter((w) => w.type === "eoa").length;

      return {
        success: true,
        data: {
          totalWallets: storedWallets.length,
          smartAccountCount,
          eoaCount,
          wallets: walletList,
          message: `You have ${storedWallets.length} wallet(s) total (${smartAccountCount} smart accounts, ${eoaCount} EOAs)`,
        },
      };
    } catch (error) {
      logger.error("Error getting wallet count:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
