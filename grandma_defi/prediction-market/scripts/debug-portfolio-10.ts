import { ethers } from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("🔍 Debugging Portfolio #10 USD Value Calculation\n");

  // Get contract instance
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = PortfolioManager.attach(
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1"
  );

  const userAddress = "0x74617D8cB1baA86d8cC2Ecf2E1b58d5B1B6374BE";
  const portfolioId = 10;

  console.log("📍 Smart Account Address:", userAddress);
  console.log("🎯 Portfolio ID:", portfolioId);
  console.log("=".repeat(60), "\n");

  try {
    // 1. Check if this address owns any portfolios
    console.log("1️⃣ CHECKING USER PORTFOLIOS:");
    const userPortfolios =
      await portfolioManager.getUserPortfolios(userAddress);
    console.log(`   Total portfolios found: ${userPortfolios.length}`);
    console.log(`   Portfolio IDs: ${userPortfolios.join(", ")}\n`);

    // 2. Get portfolio #10 details regardless of owner
    console.log("2️⃣ PORTFOLIO #10 DETAILS:");
    const [
      owner,
      tokens,
      targetAllocations,
      currentBalances,
      totalValueUSD,
      active,
    ] = await portfolioManager.getPortfolio(portfolioId);

    console.log(`   👤 Owner: ${owner}`);
    console.log(`   ✅ Active: ${active}`);
    console.log(
      `   💰 Raw Total Value: ${totalValueUSD.toString()} (raw from contract)`
    );
    console.log(
      `   💵 Formatted Total: $${(Number(totalValueUSD) / 1e8).toFixed(2)} USD`
    );
    console.log(`   🪙 Number of tokens: ${tokens.length}\n`);

    // 3. Break down each token's contribution
    console.log("3️⃣ TOKEN-BY-TOKEN BREAKDOWN:");
    let calculatedTotal = 0;

    for (let i = 0; i < tokens.length; i++) {
      const tokenAddress = tokens[i];
      const allocation = targetAllocations[i];
      const balance = currentBalances[i];

      // Get token symbol
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
      } else if (
        tokenAddress.toLowerCase() ===
        "0xf57464e2ccfbb909de54d52d1b9b4847e2be38b0"
      ) {
        symbol = "GRANDMA";
      }

      // Get token price
      const tokenPrice = await portfolioManager.getTokenPrice(tokenAddress);
      const priceUSD = Number(tokenPrice) / 1e8;

      // Format balance
      let formattedBalance = "0";
      if (symbol === "USDT") {
        formattedBalance = (Number(balance) / 1e6).toFixed(6);
      } else {
        formattedBalance = formatEther(balance);
      }

      // Calculate individual token USD value
      const tokenValueUSD =
        (Number(balance) * Number(tokenPrice)) / Math.pow(10, decimals) / 1e8;
      calculatedTotal += tokenValueUSD;

      console.log(`   ${symbol}:`);
      console.log(`     • Balance: ${formattedBalance} ${symbol}`);
      console.log(`     • Price: $${priceUSD.toFixed(2)} USD`);
      console.log(`     • Token USD Value: $${tokenValueUSD.toFixed(2)}`);
      console.log(
        `     • Allocation: ${(Number(allocation) / 100).toFixed(1)}%`
      );
      console.log("");
    }

    console.log("4️⃣ CALCULATION VERIFICATION:");
    console.log(
      `   ✅ Manual calculation total: $${calculatedTotal.toFixed(2)}`
    );
    console.log(
      `   📋 Contract reported total: $${(Number(totalValueUSD) / 1e8).toFixed(2)}`
    );
    console.log(
      `   🎯 Match: ${Math.abs(calculatedTotal - Number(totalValueUSD) / 1e8) < 0.01 ? "YES" : "NO"}\n`
    );

    // 5. Identify the problem
    console.log("5️⃣ PROBLEM IDENTIFICATION:");
    for (let i = 0; i < tokens.length; i++) {
      const tokenAddress = tokens[i];
      const balance = currentBalances[i];
      const tokenPrice = await portfolioManager.getTokenPrice(tokenAddress);
      const priceUSD = Number(tokenPrice) / 1e8;

      let symbol = "UNKNOWN";
      if (tokenAddress === "0x0000000000000000000000000000000000000000")
        symbol = "MNT";
      else if (
        tokenAddress.toLowerCase() ===
        "0xdaac95929cec4a5b2f977854868dd20116cf0ece"
      )
        symbol = "wETH";
      else if (
        tokenAddress.toLowerCase() ===
        "0x6db5d0288adcf2413afa84e06c158a5bdd85460f"
      )
        symbol = "USDT";
      else if (
        tokenAddress.toLowerCase() ===
        "0xf57464e2ccfbb909de54d52d1b9b4847e2be38b0"
      )
        symbol = "GRANDMA";

      if (priceUSD > 10000) {
        console.log(
          `   🚨 PROBLEM FOUND: ${symbol} price is $${priceUSD.toFixed(2)} (too high!)`
        );
      } else if (priceUSD < 0.01) {
        console.log(
          `   🚨 PROBLEM FOUND: ${symbol} price is $${priceUSD.toFixed(6)} (too low!)`
        );
      } else {
        console.log(
          `   ✅ ${symbol} price looks reasonable: $${priceUSD.toFixed(2)}`
        );
      }
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log(
    "💡 This script shows exactly which token is causing the huge USD value!"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });











