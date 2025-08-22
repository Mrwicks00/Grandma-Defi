import { ethers } from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("🔍 Debugging Portfolio #26 USD Value Calculation\n");

  // Get contract instance
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = PortfolioManager.attach(
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1"
  );

  const userAddress = "0x3289fA6e58B8Aa12A4D3Eae144EB8f712c62dB6B";
  const portfolioId = 26;

  console.log("📍 Smart Account Address:", userAddress);
  console.log("🎯 Portfolio ID:", portfolioId);
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

    console.log("📋 PORTFOLIO #23 DETAILS:");
    console.log(`   👤 Owner: ${owner}`);
    console.log(`   ✅ Active: ${active}`);
    console.log(`   💰 Raw Total Value: ${totalValueUSD} (raw from contract)`);
    console.log(
      `   💵 Formatted Total: $${(Number(totalValueUSD) / 1e8).toFixed(2)} USD`
    );
    console.log(`   🪙 Number of tokens: ${tokens.length}\n`);

    console.log("🔍 TOKEN-BY-TOKEN BREAKDOWN:");
    console.log("=".repeat(60));

    let calculatedTotal = 0;

    for (let i = 0; i < tokens.length; i++) {
      const tokenAddress = tokens[i];
      const balance = currentBalances[i];
      const allocation = targetAllocations[i];

      // Get token price from contract
      const price = await portfolioManager.getTokenPrice(tokenAddress);
      const priceUSD = Number(price) / 1e8;

      // Get token info
      let tokenName = "Unknown";
      let decimals = 18;

      if (tokenAddress === "0x0000000000000000000000000000000000000000") {
        tokenName = "MNT";
        decimals = 18;
      } else if (
        tokenAddress.toLowerCase() ===
        "0xdaac95929cec4a5b2f977854868dd20116cf0ece"
      ) {
        tokenName = "wETH";
        decimals = 18;
      } else if (
        tokenAddress.toLowerCase() ===
        "0x5967fcf4bc4e6b417a6b4b858f96bcff55e57aaf"
      ) {
        tokenName = "USDT18";
        decimals = 18;
      } else if (
        tokenAddress.toLowerCase() ===
        "0x741986afab100ec4ac2c25a5dd47c35d33f53995"
      ) {
        tokenName = "wBTC";
        decimals = 18;
      } else if (
        tokenAddress.toLowerCase() ===
        "0xc93f278471594324242f911fb4343d9bc2e57dbc"
      ) {
        tokenName = "GRANDMA";
        decimals = 18;
      }

      const balanceFormatted = Number(ethers.formatUnits(balance, decimals));
      const tokenValueUSD = balanceFormatted * priceUSD;
      calculatedTotal += tokenValueUSD;

      console.log(`\n📦 ${tokenName} (${tokenAddress}):`);
      console.log(`   💰 Balance: ${balanceFormatted.toFixed(6)} ${tokenName}`);
      console.log(`   💲 Price: $${priceUSD.toFixed(4)} USD`);
      console.log(`   💵 Token USD Value: $${tokenValueUSD.toFixed(2)}`);
      console.log(`   📊 Target Allocation: ${Number(allocation) / 100}%`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 CALCULATION VERIFICATION:");
    const contractTotal = Number(totalValueUSD) / 1e8;
    console.log(`   📋 Contract reported total: $${contractTotal.toFixed(2)}`);
    console.log(
      `   🧮 Manual calculated total: $${calculatedTotal.toFixed(2)}`
    );
    console.log(
      `   ⚖️  Difference: $${Math.abs(contractTotal - calculatedTotal).toFixed(2)}`
    );

    if (Math.abs(contractTotal - calculatedTotal) > 0.01) {
      console.log(`   ⚠️  Values don't match! Investigating...`);
    } else {
      console.log(`   ✅ Values match - calculation is correct`);
    }

    // Check MNT price specifically
    console.log("\n🔍 CHAINLINK PRICE VERIFICATION:");
    const mntPrice = await portfolioManager.getTokenPrice(
      "0x0000000000000000000000000000000000000000"
    );
    console.log(
      `   MNT Price from Chainlink: $${(Number(mntPrice) / 1e8).toFixed(4)}`
    );

    // Check if 20 MNT should be around this total
    const mntPriceFormatted = Number(mntPrice) / 1e8;
    const expectedValueFor20MNT = 20 * mntPriceFormatted;
    console.log(
      `   Expected value for 20 MNT: $${expectedValueFor20MNT.toFixed(2)}`
    );
  } catch (error) {
    console.log(`❌ Error checking portfolio ${portfolioId}:`, error);

    // Check if portfolio exists
    try {
      const nextPortfolioId = await portfolioManager.nextPortfolioId();
      console.log(`Next portfolio ID would be: ${nextPortfolioId}`);
      if (portfolioId >= Number(nextPortfolioId)) {
        console.log(`❌ Portfolio ${portfolioId} does not exist yet!`);
      }
    } catch (e) {
      console.log("Error checking next portfolio ID:", e);
    }
  }

  console.log("=".repeat(60));
}

main().catch(console.error);
