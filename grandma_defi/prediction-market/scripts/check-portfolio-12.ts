import { ethers } from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("🔍 Checking Portfolio #12 Token Addresses\n");

  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = PortfolioManager.attach(
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1"
  );

  try {
    // Get portfolio #12 details
    const [
      owner,
      tokens,
      targetAllocations,
      currentBalances,
      totalValueUSD,
      active,
    ] = await portfolioManager.getPortfolio(12);

    console.log("📋 PORTFOLIO #12 TOKEN ANALYSIS:");
    console.log(`   Owner: ${owner}`);
    console.log(`   Active: ${active}`);
    console.log(`   Number of tokens: ${tokens.length}\n`);

    console.log("🎯 TOKEN ADDRESSES IN PORTFOLIO #12:");
    for (let i = 0; i < tokens.length; i++) {
      const tokenAddress = tokens[i];
      const allocation = targetAllocations[i];
      const balance = currentBalances[i];

      let symbol = "UNKNOWN";
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
        symbol = "OLD USDT (6 decimals)";
      } else if (
        tokenAddress.toLowerCase() ===
        "0x5967fcf4bc4e6b417a6b4b858f96bcff55e57aaf"
      ) {
        symbol = "NEW USDT18 (18 decimals)";
      }

      console.log(`   ${i + 1}. ${tokenAddress}`);
      console.log(`      Symbol: ${symbol}`);
      console.log(
        `      Allocation: ${(Number(allocation) / 100).toFixed(1)}%`
      );
      console.log(
        `      Balance: ${tokenAddress === "0x0000000000000000000000000000000000000000" ? formatEther(balance) : balance.toString()}`
      );
      console.log("");
    }

    console.log("💡 DIAGNOSIS:");
    const hasOldUSDT = tokens.some(
      (addr) =>
        addr.toLowerCase() === "0x6db5d0288adcf2413afa84e06c158a5bdd85460f"
    );
    const hasNewUSDT = tokens.some(
      (addr) =>
        addr.toLowerCase() === "0x5967fcf4bc4e6b417a6b4b858f96bcff55e57aaf"
    );

    if (hasOldUSDT) {
      console.log("   🚨 Portfolio #12 still uses OLD USDT (6 decimals)");
      console.log("   💡 This portfolio was created before the USDT18 upgrade");
    }
    if (hasNewUSDT) {
      console.log("   ✅ Portfolio #12 uses NEW USDT18 (18 decimals)");
    }
    if (!hasOldUSDT && !hasNewUSDT) {
      console.log("   ❓ Portfolio #12 has no USDT at all");
    }

    console.log("\n🔧 SOLUTIONS:");
    console.log("   1. Create a NEW portfolio (will use USDT18 automatically)");
    console.log("   2. Existing portfolios are stuck with old token addresses");
    console.log(
      "   3. The smart contract can't update existing portfolio tokens"
    );
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











