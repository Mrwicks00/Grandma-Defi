import { ethers } from "ethers";
import { CrossChainMessenger, MessageStatus } from "@mantleio/sdk";

// Environment variables for network configuration
const L1_RPC =
  process.env.L1_RPC || "https://sepolia.infura.io/v3/your-project-id";
const L2_RPC = process.env.L2_RPC || "https://rpc.sepolia.mantle.xyz";
const L1_CHAINID = process.env.L1_CHAINID || "11155111"; // Sepolia
const L2_CHAINID = process.env.L2_CHAINID || "5003"; // Mantle Sepolia

// MNT token addresses (testnet)
const L1_MNT_ADDRESS =
  process.env.L1_MNT || "0x4200000000000000000000000000000000000006"; // Sepolia MNT
const L2_MNT_ADDRESS =
  process.env.L2_MNT || "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000"; // Mantle Sepolia MNT

// TestERC20 ABI (simplified for MNT operations)
const MNT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

let crossChainMessenger: CrossChainMessenger;
let l1Provider: any;
let l2Provider: any;
let l1MntContract: any;
let l2MntContract: any;

export async function setupCrossChainMessenger(privateKey?: string) {
  try {
    // Initialize providers
    l1Provider = new ethers.JsonRpcProvider(L1_RPC);
    l2Provider = new ethers.JsonRpcProvider(L2_RPC);

    // Initialize wallets if private key provided
    const l1Wallet = privateKey
      ? new ethers.Wallet(privateKey, l1Provider)
      : null;
    const l2Wallet = privateKey
      ? new ethers.Wallet(privateKey, l2Provider)
      : null;

    // Initialize cross-chain messenger
    crossChainMessenger = new CrossChainMessenger({
      l1ChainId: parseInt(L1_CHAINID),
      l2ChainId: parseInt(L2_CHAINID),
      l1SignerOrProvider: l1Wallet || l1Provider,
      l2SignerOrProvider: l2Wallet || l2Provider,
    });

    // Initialize MNT contracts
    l1MntContract = new ethers.Contract(
      L1_MNT_ADDRESS,
      MNT_ABI,
      l1Wallet || l1Provider
    );
    l2MntContract = new ethers.Contract(
      L2_MNT_ADDRESS,
      MNT_ABI,
      l2Wallet || l2Provider
    );

    return {
      crossChainMessenger,
      l1Wallet,
      l2Wallet,
      l1MntContract,
      l2MntContract,
    };
  } catch (error) {
    throw new Error(`Failed to setup cross-chain messenger: ${error}`);
  }
}

export async function depositMNT(privateKey: string, amount: string) {
  try {
    const setup = await setupCrossChainMessenger(privateKey);
    const { crossChainMessenger, l1Wallet, l1MntContract } = setup;

    if (!l1Wallet) {
      throw new Error("Wallet not initialized");
    }

    const amountWei = ethers.parseEther(amount);

    // Check allowance and approve if needed
    const allowance = await l1MntContract.allowance(
      l1Wallet.address,
      crossChainMessenger.contracts.l1.L1StandardBridge.address
    );
    if (allowance < amountWei) {
      console.log("Approving MNT for bridge...");
      const approveTx = await crossChainMessenger.approveERC20(
        L1_MNT_ADDRESS,
        L2_MNT_ADDRESS,
        amountWei
      );
      await approveTx.wait();
    }

    // Deposit MNT to L2
    console.log(`Depositing ${amount} MNT to Mantle...`);
    const depositTx = await crossChainMessenger.depositERC20(
      L1_MNT_ADDRESS,
      L2_MNT_ADDRESS,
      amountWei
    );
    await depositTx.wait();

    return {
      transactionHash: depositTx.hash,
      amount: amount,
      direction: "L1 to L2",
    };
  } catch (error) {
    throw new Error(`Failed to deposit MNT: ${error}`);
  }
}

export async function withdrawMNT(privateKey: string, amount: string) {
  try {
    const setup = await setupCrossChainMessenger(privateKey);
    const { crossChainMessenger, l2Wallet } = setup;

    if (!l2Wallet) {
      throw new Error("Wallet not initialized");
    }

    const amountWei = ethers.parseEther(amount);

    // Withdraw MNT from L2 to L1
    console.log(`Withdrawing ${amount} MNT from Mantle...`);
    const withdrawTx = await crossChainMessenger.withdrawERC20(
      L1_MNT_ADDRESS,
      L2_MNT_ADDRESS,
      amountWei
    );
    await withdrawTx.wait();

    return {
      transactionHash: withdrawTx.hash,
      amount: amount,
      direction: "L2 to L1",
    };
  } catch (error) {
    throw new Error(`Failed to withdraw MNT: ${error}`);
  }
}

export async function getBalances(privateKey: string) {
  try {
    const setup = await setupCrossChainMessenger(privateKey);
    const { l1Wallet, l2Wallet, l1MntContract, l2MntContract } = setup;

    if (!l1Wallet || !l2Wallet) {
      throw new Error("Wallets not initialized");
    }

    // Get balances
    const l1Balance = await l1MntContract.balanceOf(l1Wallet.address);
    const l2Balance = await l2MntContract.balanceOf(l2Wallet.address);

    // Get native token balances
    const l1EthBalance = await l1Provider.getBalance(l1Wallet.address);
    const l2MntBalance = await l2Provider.getBalance(l2Wallet.address);

    return {
      ethereumBalance: ethers.formatEther(l1Balance),
      mantleBalance: ethers.formatEther(l2Balance),
      ethereumEthBalance: ethers.formatEther(l1EthBalance),
      mantleMntBalance: ethers.formatEther(l2MntBalance),
      ethereumAddress: l1Wallet.address,
      mantleAddress: l2Wallet.address,
    };
  } catch (error) {
    throw new Error(`Failed to get balances: ${error}`);
  }
}

export async function checkMessageStatus(transactionHash: string) {
  try {
    if (!crossChainMessenger) {
      await setupCrossChainMessenger();
    }

    const status = await crossChainMessenger.getMessageStatus(transactionHash);

    let message = "";
    let estimatedCompletion = "";

    switch (status) {
      case MessageStatus.UNCONFIRMED_L1_TO_L2_MESSAGE:
        message = "Transaction submitted to L1, waiting for confirmation...";
        estimatedCompletion = "2-5 minutes";
        break;
      case MessageStatus.FAILED_L1_TO_L2_MESSAGE:
        message = "Transaction failed on L1";
        estimatedCompletion = "Failed";
        break;
      case MessageStatus.STATE_ROOT_NOT_PUBLISHED:
        message = "Waiting for state root to be published...";
        estimatedCompletion = "5-10 minutes";
        break;
      case MessageStatus.IN_CHALLENGE_PERIOD:
        message = "Transaction in challenge period...";
        estimatedCompletion = "7 days";
        break;
      case MessageStatus.READY_FOR_RELAY:
        message = "Ready to finalize on L1...";
        estimatedCompletion = "Ready to finalize";
        break;
      case MessageStatus.RELAYED:
        message = "Transaction completed successfully!";
        estimatedCompletion = "Completed";
        break;
      default:
        message = "Unknown status";
        estimatedCompletion = "Unknown";
    }

    return {
      status: MessageStatus[status],
      message: message,
      estimatedCompletion: estimatedCompletion,
    };
  } catch (error) {
    throw new Error(`Failed to check message status: ${error}`);
  }
}

export async function finalizeWithdrawal(
  transactionHash: string,
  privateKey: string
) {
  try {
    const setup = await setupCrossChainMessenger(privateKey);
    const { crossChainMessenger } = setup;

    // Check if ready for relay
    const status = await crossChainMessenger.getMessageStatus(transactionHash);
    if (status !== MessageStatus.READY_FOR_RELAY) {
      throw new Error(
        `Transaction not ready for relay. Current status: ${MessageStatus[status]}`
      );
    }

    // Finalize the withdrawal
    const finalizeTx =
      await crossChainMessenger.finalizeMessage(transactionHash);
    await finalizeTx.wait();

    return {
      transactionHash: finalizeTx.hash,
      status: "Finalized",
    };
  } catch (error) {
    throw new Error(`Failed to finalize withdrawal: ${error}`);
  }
}
