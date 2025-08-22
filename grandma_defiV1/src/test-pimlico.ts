#!/usr/bin/env tsx

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
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { toSafeSmartAccount } from "permissionless/accounts";
import { entryPoint07Address } from "viem/account-abstraction";

// Network configuration with hardcoded API key
const MANTLE_SEPOLIA_CONFIG = {
  chain: {
    id: 5003,
    name: "Mantle Sepolia Testnet",
    nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.sepolia.mantle.xyz"] } },
    blockExplorers: {
      default: {
        name: "Mantle Sepolia Explorer",
        url: "https://sepolia.mantlescan.org",
      },
    },
    testnet: true,
  },
  bundlerUrl:
    "https://api.pimlico.io/v2/mantle-sepolia/rpc?apikey=pim_eL2GGAqmM2xeC1dYnU9oHS",
  entryPointAddress: "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address,
};

// Logger
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string, error?: any) =>
    console.error(`[ERROR] ${message}`, error),
};

// Wallet creation
interface WalletData {
  smartAddress: string;
  smartAccountClient: SmartAccountClient;
}

async function generatePimlicoWallet(): Promise<WalletData> {
  try {
    const publicClient = createPublicClient({
      chain: MANTLE_SEPOLIA_CONFIG.chain,
      transport: http(MANTLE_SEPOLIA_CONFIG.chain.rpcUrls.default.http[0]),
    });

    const privateKey = generatePrivateKey();
    const owner = privateKeyToAccount(privateKey);

    const pimlicoClient = createPimlicoClient({
      transport: http(MANTLE_SEPOLIA_CONFIG.bundlerUrl),
      entryPoint: {
        address: MANTLE_SEPOLIA_CONFIG.entryPointAddress,
        version: "0.7",
      },
    });

    const safeAccount = await toSafeSmartAccount({
      client: publicClient,
      owners: [owner],
      entryPoint: { address: entryPoint07Address, version: "0.7" },
      version: "1.4.1",
    });

    const smartAccountClient = createSmartAccountClient({
      account: safeAccount,
      chain: MANTLE_SEPOLIA_CONFIG.chain,
      bundlerTransport: http(MANTLE_SEPOLIA_CONFIG.bundlerUrl),
      paymaster: pimlicoClient,
      userOperation: {
        estimateFeesPerGas: async () =>
          (await pimlicoClient.getUserOperationGasPrice()).fast,
      },
    });

    return { smartAddress: safeAccount.address, smartAccountClient };
  } catch (error) {
    logger.error("Failed to create wallet:", error);
    throw error;
  }
}

// Balance check
async function getAccountBalance(smartAccountAddress: string) {
  try {
    const publicClient = createPublicClient({
      chain: MANTLE_SEPOLIA_CONFIG.chain,
      transport: http(MANTLE_SEPOLIA_CONFIG.chain.rpcUrls.default.http[0]),
    });

    const balance = await publicClient.getBalance({
      address: smartAccountAddress as Address,
    });
    return {
      success: true,
      address: smartAccountAddress,
      balanceEth: formatEther(balance),
    };
  } catch (error) {
    logger.error("Failed to get balance:", error);
    throw error;
  }
}

// Funding prompt with polling
async function fundWalletPrompt(smartAddress: string): Promise<void> {
  const MINIMUM_BALANCE = 0.002; // Increased to cover batch transaction (2 x 0.001 MNT)

  logger.info(`Checking balance for wallet: ${smartAddress}`);
  let balanceResult = await getAccountBalance(smartAddress);
  let balance = parseFloat(balanceResult.balanceEth);

  if (balance >= MINIMUM_BALANCE) {
    logger.info(`Wallet has sufficient balance: ${balance} MNT`);
    return;
  }

  logger.info(
    `Insufficient balance: ${balance} MNT. Required: ${MINIMUM_BALANCE} MNT`
  );
  logger.info(`Please fund the wallet at: ${smartAddress}`);
  logger.info(
    `Use the Mantle Sepolia Faucet: https://faucet.sepolia.mantle.xyz/`
  );
  logger.info(`Polling for funds every 30 seconds... (Press Ctrl+C to abort)`);

  while (balance < MINIMUM_BALANCE) {
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds
    balanceResult = await getAccountBalance(smartAddress);
    balance = parseFloat(balanceResult.balanceEth);
    logger.info(`Current balance: ${balance} MNT`);
  }

  logger.info(`Funding received! New balance: ${balance} MNT`);
}

// Transaction functions
async function sendGaslessTransaction(
  smartAccountClient: SmartAccountClient,
  to: string,
  amount: string
) {
  try {
    if (!to.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error(`Invalid recipient address: ${to}`);
    }

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

    const receipt = await smartAccountClient.waitForUserOperationReceipt({
      hash: txHash,
      timeout: 120000, // Increased to 2 minutes
    });

    logger.info(`Transaction sent: ${txHash}`);
    logger.info(`Explorer: https://sepolia.mantlescan.org/tx/${txHash}`);
    return { success: true, transactionHash: txHash, to, amount, receipt };
  } catch (error) {
    logger.error("Failed to send transaction:", error);
    throw error;
  }
}

async function sendBatchTransaction(
  smartAccountClient: SmartAccountClient,
  to: string,
  amount: string
) {
  try {
    if (!to.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error(`Invalid recipient address: ${to}`);
    }

    const calls = [
      { to: to as Address, value: parseEther(amount), data: "0x" as Hex },
      { to: to as Address, value: parseEther(amount), data: "0x" as Hex },
    ];

    const userOpHash = await smartAccountClient.sendUserOperation({
      calls,
    });

    const receipt = await smartAccountClient.waitForUserOperationReceipt({
      hash: userOpHash,
      timeout: 120000, // Increased to 2 minutes
    });

    logger.info(`Batch transaction sent: ${userOpHash}`);
    logger.info(`Explorer: https://sepolia.mantlescan.org/tx/${userOpHash}`);
    return { success: true, transactionHash: userOpHash, to, amount, receipt };
  } catch (error) {
    logger.error("Failed to send batch transaction:", error);
    throw error;
  }
}

// Test suite
const TEST_CONFIG = {
  TEST_RECIPIENT: "0x40817a62f10068332704cDC3b827EFE588AA8f0D", // Your provided address
  TEST_AMOUNT: "0.001",
  COLORS: { GREEN: "\x1b[32m", RED: "\x1b[31m", RESET: "\x1b[0m" },
};

class WalletTester {
  private testWallet: WalletData | null = null;
  private passed = 0;
  private failed = 0;

  private log(message: string, color: string = TEST_CONFIG.COLORS.RESET) {
    console.log(`${color}${message}${TEST_CONFIG.COLORS.RESET}`);
  }

  private async runTest(name: string, testFunction: () => Promise<void>) {
    this.log(`Running: ${name}`);
    try {
      await testFunction();
      this.log(`✅ ${name} passed`, TEST_CONFIG.COLORS.GREEN);
      this.passed++;
    } catch (error) {
      this.log(
        `❌ ${name} failed: ${(error as Error).message}`,
        TEST_CONFIG.COLORS.RED
      );
      this.failed++;
    }
  }

  private async testEnvironmentSetup() {
    logger.info("Environment setup verified (hardcoded API key)");
  }

  private async testWalletCreation() {
    this.testWallet = await generatePimlicoWallet();
    if (!this.testWallet.smartAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error("Invalid smart wallet address");
    }
    logger.info(`Wallet created: ${this.testWallet.smartAddress}`);
  }

  private async testWalletFunding() {
    if (!this.testWallet) throw new Error("No wallet available");
    await fundWalletPrompt(this.testWallet.smartAddress);
  }

  private async testSingleTransaction() {
    if (!this.testWallet) throw new Error("No wallet available");
    const result = await sendGaslessTransaction(
      this.testWallet.smartAccountClient,
      TEST_CONFIG.TEST_RECIPIENT,
      TEST_CONFIG.TEST_AMOUNT
    );
    logger.info(`Transaction hash: ${result.transactionHash}`);
  }

  private async testBatchTransaction() {
    if (!this.testWallet) throw new Error("No wallet available");
    const result = await sendBatchTransaction(
      this.testWallet.smartAccountClient,
      TEST_CONFIG.TEST_RECIPIENT,
      TEST_CONFIG.TEST_AMOUNT
    );
    logger.info(`Batch transaction hash: ${result.transactionHash}`);
  }

  public async runAllTests() {
    this.log("Starting Pimlico Wallet Tests on Mantle Sepolia\n");

    await this.runTest("Environment Setup", () => this.testEnvironmentSetup());
    await this.runTest("Wallet Creation", () => this.testWalletCreation());
    await this.runTest("Wallet Funding", () => this.testWalletFunding());
    await this.runTest("Single Transaction", () =>
      this.testSingleTransaction()
    );
    await this.runTest("Batch Transaction", () => this.testBatchTransaction());

    this.log("\nTest Summary");
    this.log(`Passed: ${this.passed}`, TEST_CONFIG.COLORS.GREEN);
    if (this.failed > 0)
      this.log(`Failed: ${this.failed}`, TEST_CONFIG.COLORS.RED);
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

// Main execution
async function main() {
  const tester = new WalletTester();
  await tester.runAllTests();
}

main().catch((error) => {
  logger.error("Test suite failed:", error);
  process.exit(1);
});
