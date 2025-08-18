import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing portfolio creation with balanced pools...");

  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";

  // New balanced token addresses
  const TOKENS = {
    MNT: "0x0000000000000000000000000000000000000000",
    wETH: "0x1e8a097E2942292264dFd840cE2328056Fec716c",
    wBTC: "0xcBe1f9dD7D64fce92Cf27B7E761cF0590a312DB8",
    USDT18: "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf",
    GRANDMA: "0xC93F278471594324242F911Fb4343D9bC2e57Dbc",
  };

  const [deployer] = await ethers.getSigners();
  console.log("Testing with address:", deployer.address);

  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );

  // Test 1: Create a balanced portfolio with the new tokens
  console.log("\n📊 Test 1: Creating balanced portfolio...");
  console.log("Investment: 30 MNT (~$30 expected)");

  const portfolioTokens = [TOKENS.MNT, TOKENS.wETH, TOKENS.USDT18];

  // 40% MNT, 40% wETH, 20% USDT18
  const allocations = [4000, 4000, 2000];
  const investmentAmount = ethers.parseEther("30");

  console.log("Tokens:", portfolioTokens);
  console.log("Allocations: 40% MNT, 40% wETH, 20% USDT18");

  try {
    const tx = await PortfolioManager.createPortfolio(
      portfolioTokens,
      allocations,
      500, // 5% rebalance threshold
      { value: investmentAmount }
    );

    console.log("✅ Portfolio created! TX:", tx.hash);
    await tx.wait();
    console.log("✅ Transaction confirmed");

    // Get the new portfolio ID
    const userPortfolios = await PortfolioManager.getUserPortfolios(
      deployer.address
    );
    const latestPortfolioId = userPortfolios[userPortfolios.length - 1];
    console.log("🎯 Portfolio ID:", latestPortfolioId.toString());

    // Get detailed portfolio information
    console.log("\n📋 Portfolio Analysis:");
    const portfolioData =
      await PortfolioManager.getPortfolio(latestPortfolioId);
    const [
      owner,
      tokens,
      targetAllocations,
      currentBalances,
      totalValueUSD,
      active,
    ] = portfolioData;

    console.log("Owner:", owner);
    console.log("Active:", active);

    const totalUSD = Number(totalValueUSD) / 1e8;
    console.log(`💰 Total Value: $${totalUSD.toFixed(2)} USD`);
    console.log(`🎯 Expected: ~$30.50 USD (30 MNT × $1.017)`);

    const accuracyPercentage = ((30.5 - totalUSD) / 30.5) * 100;
    if (Math.abs(accuracyPercentage) < 10) {
      console.log(
        `✅ Value accuracy: ${Math.abs(accuracyPercentage).toFixed(1)}% off (GOOD!)`
      );
    } else {
      console.log(
        `❌ Value accuracy: ${Math.abs(accuracyPercentage).toFixed(1)}% off (needs fixing)`
      );
    }

    // Break down each token
    console.log("\n🔍 Token Breakdown:");
    for (let i = 0; i < tokens.length; i++) {
      const tokenAddr = tokens[i];
      const targetAllocation = Number(targetAllocations[i]) / 100; // Convert from basis points
      const balance = ethers.formatEther(currentBalances[i]);

      let tokenName = "Unknown";
      let expectedPrice = 0;

      if (tokenAddr === TOKENS.MNT) {
        tokenName = "MNT";
        expectedPrice = 1.017;
      } else if (tokenAddr === TOKENS.wETH) {
        tokenName = "wETH";
        expectedPrice = 4278.2;
      } else if (tokenAddr === TOKENS.USDT18) {
        tokenName = "USDT18";
        expectedPrice = 1.0;
      }

      const tokenValue = parseFloat(balance) * expectedPrice;
      const expectedValue = 30 * (targetAllocation / 100);

      console.log(`\n• ${tokenName}:`);
      console.log(`  Balance: ${balance} ${tokenName}`);
      console.log(`  Target Allocation: ${targetAllocation}%`);
      console.log(`  Estimated Value: $${tokenValue.toFixed(2)}`);
      console.log(`  Expected Value: $${expectedValue.toFixed(2)}`);

      if (Math.abs(tokenValue - expectedValue) < 2) {
        console.log(`  ✅ Allocation accurate`);
      } else {
        console.log(
          `  ⚠️  Allocation off by $${Math.abs(tokenValue - expectedValue).toFixed(2)}`
        );
      }
    }

    // Test 2: Try another portfolio with different tokens
    console.log("\n\n📊 Test 2: Creating portfolio with GRANDMA...");
    console.log("Investment: 20 MNT (~$20 expected)");

    const grandmaTokens = [TOKENS.MNT, TOKENS.GRANDMA];
    const grandmaAllocations = [5000, 5000]; // 50/50
    const grandmaInvestment = ethers.parseEther("20");

    const tx2 = await PortfolioManager.createPortfolio(
      grandmaTokens,
      grandmaAllocations,
      500,
      { value: grandmaInvestment }
    );

    console.log("✅ GRANDMA portfolio created! TX:", tx2.hash);
    await tx2.wait();

    const userPortfolios2 = await PortfolioManager.getUserPortfolios(
      deployer.address
    );
    const latestPortfolioId2 = userPortfolios2[userPortfolios2.length - 1];

    const portfolioData2 =
      await PortfolioManager.getPortfolio(latestPortfolioId2);
    const totalValueUSD2 = Number(portfolioData2[4]) / 1e8;

    console.log(
      `💰 GRANDMA Portfolio Value: $${totalValueUSD2.toFixed(2)} USD`
    );
    console.log(`🎯 Expected: ~$20.34 USD (20 MNT × $1.017)`);

    const accuracy2 = ((20.34 - totalValueUSD2) / 20.34) * 100;
    if (Math.abs(accuracy2) < 10) {
      console.log(
        `✅ GRANDMA portfolio accuracy: ${Math.abs(accuracy2).toFixed(1)}% off (GOOD!)`
      );
    } else {
      console.log(
        `❌ GRANDMA portfolio accuracy: ${Math.abs(accuracy2).toFixed(1)}% off`
      );
    }

    console.log("\n🎉 PORTFOLIO TESTING COMPLETED!");
    console.log("==================================================");

    if (Math.abs(accuracyPercentage) < 10 && Math.abs(accuracy2) < 10) {
      console.log("✅ SUCCESS: Portfolio values are now accurate!");
      console.log("✅ The pool rebalancing fixed the valuation issues!");
      console.log("✅ Your ElizaOS frontend should now show correct values!");
    } else {
      console.log("❌ VALUES STILL OFF: May need further pool adjustments");
    }
  } catch (error) {
    console.error("❌ Portfolio creation failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });










