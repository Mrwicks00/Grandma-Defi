import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  console.log("🧪 Testing Portfolio Creation and Swap Functionality");
  console.log("=".repeat(60));

  // Get the deployed contract
  const portfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1"
  );

  const [deployer] = await ethers.getSigners();
  console.log("📍 Using account:", deployer.address);
  console.log(
    "💰 Account balance:",
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "MNT"
  );

  try {
    // 1. Check supported tokens
    console.log("\n1️⃣ Checking Supported Tokens:");
    const tokens = [
      {
        name: "Native MNT",
        address: "0x0000000000000000000000000000000000000000",
      },
      { name: "wETH", address: "0x1e8a097E2942292264dFd840cE2328056Fec716c" },
      { name: "wBTC", address: "0xcBe1f9dD7D64fce92Cf27B7E761cF0590a312DB8" },
      { name: "USDT18", address: "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf" },
      {
        name: "GRANDMA",
        address: "0xC93F278471594324242F911Fb4343D9bC2e57Dbc",
      },
    ];

    for (const token of tokens) {
      try {
        const price = await portfolioManager.getTokenPrice(token.address);
        console.log(`✅ ${token.name}: $${(Number(price) / 1e8).toFixed(4)}`);
      } catch (error) {
        console.log(`❌ ${token.name}: Not supported or price unavailable`);
      }
    }

    // 2. Create a test portfolio
    console.log("\n2️⃣ Creating Test Portfolio:");
    const testTokens = [
      "0x0000000000000000000000000000000000000000", // MNT
      "0x1e8a097E2942292264dFd840cE2328056Fec716c", // wETH
      "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf", // USDT18
    ];
    const testAllocations = [4000, 4000, 2000]; // 40%, 40%, 20%
    const rebalanceThreshold = 500; // 5%
    const initialValue = ethers.parseEther("10"); // 10 MNT

    console.log("🔄 Creating portfolio with 10 MNT...");
    const createTx = await portfolioManager.createPortfolio(
      testTokens,
      testAllocations,
      rebalanceThreshold,
      { value: initialValue }
    );

    const receipt = await createTx.wait();
    console.log("✅ Portfolio created! TX:", receipt?.hash);

    // Get the portfolio ID - use the latest portfolio ID
    const nextId = await portfolioManager.nextPortfolioId();
    const portfolioId = Number(nextId) - 1;
    console.log("📋 Portfolio ID:", portfolioId);

    // Verify the portfolio exists
    try {
      const testPortfolio = await portfolioManager.getPortfolio(portfolioId);
      console.log("✅ Portfolio confirmed to exist");
    } catch (error) {
      console.log("❌ Portfolio not found, something went wrong");
      return;
    }

    // 3. Check portfolio details
    console.log("\n3️⃣ Checking Portfolio Details:");
    const portfolioData = await portfolioManager.getPortfolio(portfolioId);
    console.log("👤 Owner:", portfolioData[0]);
    console.log(
      "💰 Total Value:",
      `$${(Number(portfolioData[4]) / 1e8).toFixed(2)}`
    );
    console.log("🟢 Active:", portfolioData[5]);

    const tokens_in_portfolio = portfolioData[1] as string[];
    const balances = portfolioData[3] as bigint[];

    console.log("📊 Token Holdings:");
    tokens_in_portfolio.forEach((tokenAddr: string, index: number) => {
      const tokenName =
        tokens.find((t) => t.address.toLowerCase() === tokenAddr.toLowerCase())
          ?.name || "Unknown";
      const balance = ethers.formatEther(balances[index]);
      console.log(`   ${tokenName}: ${balance}`);
    });

    // 4. Test rebalancing (simulating a swap)
    console.log("\n4️⃣ Testing Portfolio Rebalancing:");
    console.log("🔄 Triggering rebalance...");
    const rebalanceTx = await portfolioManager.rebalanceNow(portfolioId);
    const rebalanceReceipt = await rebalanceTx.wait();
    console.log("✅ Rebalance completed! TX:", rebalanceReceipt?.hash);

    // 5. Check updated portfolio
    console.log("\n5️⃣ Portfolio After Rebalance:");
    const updatedPortfolioData =
      await portfolioManager.getPortfolio(portfolioId);
    const updatedBalances = updatedPortfolioData[3] as bigint[];

    console.log("📊 Updated Token Holdings:");
    tokens_in_portfolio.forEach((tokenAddr: string, index: number) => {
      const tokenName =
        tokens.find((t) => t.address.toLowerCase() === tokenAddr.toLowerCase())
          ?.name || "Unknown";
      const balance = ethers.formatEther(updatedBalances[index]);
      console.log(`   ${tokenName}: ${balance}`);
    });

    console.log("\n✅ All tests completed successfully!");
    console.log("🎯 Portfolio ID for testing:", portfolioId);
  } catch (error) {
    console.error("❌ Test failed:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);

      // Try to decode the error if it's a contract revert
      if (error.message.includes("reverted")) {
        console.error("This is likely a contract revert. Check:");
        console.error("- Token support in PortfolioManager");
        console.error("- Pool liquidity for swaps");
        console.error("- Price feed availability");
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
