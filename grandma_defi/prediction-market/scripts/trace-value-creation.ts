import { ethers } from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("🕵️ Tracing Where Extra Value Came From in Portfolio #10\n");

  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = PortfolioManager.attach(
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1"
  );

  const portfolioId = 10;

  console.log("🎯 INVESTIGATION: Portfolio #10 Value Mystery");
  console.log("Expected: ~$19-20 USD (from 20 MNT investment)");
  console.log("Actual: $26.72 USD");
  console.log("Difference: +$6-7 USD (35% more than expected!)");
  console.log("=".repeat(60), "\n");

  try {
    // Get portfolio details
    const [
      owner,
      tokens,
      targetAllocations,
      currentBalances,
      totalValueUSD,
      active,
    ] = await portfolioManager.getPortfolio(portfolioId);

    console.log("1️⃣ CURRENT PORTFOLIO STATE:");
    console.log(`   Raw total value: ${totalValueUSD.toString()}`);
    console.log(
      `   Formatted total: $${(Number(totalValueUSD) / 1e8).toFixed(2)}`
    );
    console.log("");

    // Calculate expected vs actual for each token
    console.log("2️⃣ TOKEN-BY-TOKEN VALUE ANALYSIS:");

    let totalExpectedMNT = 0;
    let totalActualValue = 0;

    for (let i = 0; i < tokens.length; i++) {
      const tokenAddress = tokens[i];
      const allocation = Number(targetAllocations[i]) / 100; // Convert basis points to percentage
      const balance = currentBalances[i];

      let symbol = "UNKNOWN";
      let decimals = 18;
      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        symbol = "MNT";
      } else if (
        tokenAddress.toLowerCase() ===
        "0xdaac95929cec4a5b2f977854868dd20116cf0ece"
      ) {
        symbol = "wETH";
      } else if (
        tokenAddress.toLowerCase() ===
        "0x6db5d0288adcf2413afa84e06c158a5bdd85460f"
      ) {
        symbol = "USDT";
        decimals = 6;
      }

      // Get current price
      const tokenPrice = await portfolioManager.getTokenPrice(tokenAddress);
      const priceUSD = Number(tokenPrice) / 1e8;

      // Calculate values
      const balanceFormatted =
        symbol === "USDT"
          ? (Number(balance) / 1e6).toFixed(6)
          : formatEther(balance);

      const actualTokenValueUSD =
        (Number(balance) * priceUSD) / Math.pow(10, decimals);

      // Expected: What this allocation should be worth from 20 MNT
      const expectedMNTForThisToken = 20 * (allocation / 100);
      const expectedUSDForThisToken = expectedMNTForThisToken * 0.95; // Assuming $0.95 MNT price

      totalExpectedMNT += expectedMNTForThisToken;
      totalActualValue += actualTokenValueUSD;

      console.log(`   ${symbol}:`);
      console.log(`     • Current Balance: ${balanceFormatted} ${symbol}`);
      console.log(`     • Current Price: $${priceUSD.toFixed(2)}`);
      console.log(
        `     • Current USD Value: $${actualTokenValueUSD.toFixed(2)}`
      );
      console.log(
        `     • Expected Allocation: ${allocation.toFixed(1)}% (${expectedMNTForThisToken} MNT)`
      );
      console.log(
        `     • Expected USD Value: $${expectedUSDForThisToken.toFixed(2)}`
      );
      console.log(
        `     • Value Difference: ${actualTokenValueUSD > expectedUSDForThisToken ? "+" : ""}$${(actualTokenValueUSD - expectedUSDForThisToken).toFixed(2)}`
      );
      console.log("");
    }

    console.log("3️⃣ PORTFOLIO TOTALS COMPARISON:");
    console.log(
      `   Expected Total: $${(totalExpectedMNT * 0.95).toFixed(2)} (${totalExpectedMNT} MNT × $0.95)`
    );
    console.log(`   Actual Total: $${totalActualValue.toFixed(2)}`);
    console.log(
      `   Extra Value: +$${(totalActualValue - totalExpectedMNT * 0.95).toFixed(2)}`
    );
    console.log("");

    console.log("4️⃣ POSSIBLE EXPLANATIONS:");
    console.log(
      "   🔍 Checking AMM pool ratios that might have given favorable swaps..."
    );

    // Check AMM pool ratios for wETH (the main beneficiary)
    const wethPool = await portfolioManager.liquidityPools(
      "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece"
    );
    const wethPoolRatio =
      Number(wethPool.mntReserve) / Number(wethPool.tokenReserve);

    console.log(
      `   🏊 wETH Pool Ratio: 1 wETH = ${wethPoolRatio.toFixed(2)} MNT`
    );
    console.log(
      `   💹 wETH Market Price: 1 wETH = ${(4276.12 / 0.95).toFixed(2)} MNT equivalent`
    );

    if (wethPoolRatio < 4276.12 / 0.95) {
      console.log(
        `   🎯 FOUND IT! wETH was cheaper in the AMM pool than market price!`
      );
      console.log(
        `   💰 You got wETH at a ${(((4276.12 / 0.95 - wethPoolRatio) / (4276.12 / 0.95)) * 100).toFixed(1)}% discount`
      );
    }

    console.log("");
    console.log("5️⃣ CONCLUSION:");
    console.log("   The extra value likely came from:");
    console.log("   • Favorable AMM swap rates (pool ratios != market prices)");
    console.log("   • Price appreciation between investment and now");
    console.log("   • Arbitrage opportunities in the testnet AMM");
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });





