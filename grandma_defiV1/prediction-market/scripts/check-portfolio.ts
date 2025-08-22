import { ethers } from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("📊 Checking actual portfolio data from smart contract...\n");

  // Get contract instance
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = PortfolioManager.attach(
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1"
  );

  const [deployer] = await ethers.getSigners();
  console.log("🔑 Account:", deployer.address);

  // Check multiple addresses from wallet creation outputs
  const addresses = [
    "0xedc6a89ee5fd4f5f09c9f5f68a56bfdfecb6783b", // From UI display
    "0xf4f9fe0295b9ac5822e61210579abf0e70dfe13d", // From earlier wallet creation
  ];

  console.log("👤 Checking portfolios for multiple addresses...\n");

  // Check each address for portfolios
  for (const userAddress of addresses) {
    console.log(`🔍 Checking address: ${userAddress}`);

    try {
      // Get user portfolios
      const userPortfolios =
        await portfolioManager.getUserPortfolios(userAddress);
      console.log(`📈 Total Portfolios Found: ${userPortfolios.length}`);

      if (userPortfolios.length > 0) {
        console.log(`🎯 Portfolio IDs: ${userPortfolios.join(", ")}\n`);

        // Check each portfolio
        for (let i = 0; i < userPortfolios.length; i++) {
          const portfolioId = userPortfolios[i];
          console.log(`📋 PORTFOLIO #${portfolioId} DETAILS:`);
          console.log("=".repeat(50));

          try {
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
              `   💰 Total Value: $${(Number(totalValueUSD) / 1e8).toFixed(2)} USD`
            );
            console.log(`   🪙 Tokens (${tokens.length}):`);

            for (let j = 0; j < tokens.length; j++) {
              const tokenAddress = tokens[j];
              const allocation = targetAllocations[j];
              const balance = currentBalances[j];

              // Get token symbol
              let symbol = "UNKNOWN";
              if (
                tokenAddress === "0x0000000000000000000000000000000000000000"
              ) {
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
              } else if (
                tokenAddress.toLowerCase() ===
                "0xf57464e2ccfbb909de54d52d1b9b4847e2be38b0"
              ) {
                symbol = "GRANDMA";
              }

              const allocationPercent = (Number(allocation) / 100).toFixed(1);

              // Format balance based on token
              let formattedBalance = "0";
              if (symbol === "USDT") {
                formattedBalance = (Number(balance) / 1e6).toFixed(6); // USDT has 6 decimals
              } else {
                formattedBalance = formatEther(balance); // 18 decimals
              }

              console.log(
                `      • ${symbol}: ${formattedBalance} ${symbol} (${allocationPercent}%)`
              );
            }

            console.log("");
          } catch (error) {
            console.log(
              `   ❌ Error getting portfolio ${portfolioId}:`,
              error.message
            );
          }
        }
      } else {
        console.log("   No portfolios found for this address\n");
      }
    } catch (error) {
      console.log(`   ❌ Error getting user portfolios:`, error.message, "\n");
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("💡 OBSERVATIONS:");
  console.log("=".repeat(60));
  console.log("• Portfolio IDs are sequential numbers (7, 8, etc.)");
  console.log("• Transaction hashes (0xB3A1C2D4...) are NOT portfolio IDs");
  console.log(
    "• Token balances should show actual amounts, not just percentages"
  );
  console.log("• Total USD values should reflect actual investment amounts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
