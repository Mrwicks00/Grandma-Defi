import { ethers } from "hardhat";

async function main() {
  console.log("💧 Checking liquidity pools...\n");

  const PORTFOLIO_MANAGER = "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";
  const ADDRESSES = {
    wETH: "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece",
    wBTC: "0x741986AFAB100Ec4ac2C25a5DD47C35d33f53995",
    USDT: "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F",
    GRANDMA: "0xF57464e2cCfbB909dE54D52d1B9B4847E2bE38b0",
  };

  const portfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER
  );

  console.log("📊 LIQUIDITY POOL STATUS");
  console.log("=".repeat(50));

  try {
    for (const [tokenName, tokenAddress] of Object.entries(ADDRESSES)) {
      console.log(`\n🔸 ${tokenName} Pool:`);

      try {
        // Get liquidity pool info (this requires the pool to be public in contract)
        // We'll try to call the liquidityPools mapping
        const poolData = await portfolioManager.liquidityPools(tokenAddress);

        console.log(
          `   💰 MNT Reserve: ${ethers.formatEther(poolData.mntReserve)} MNT`
        );
        console.log(
          `   🪙 Token Reserve: ${ethers.formatEther(poolData.tokenReserve)} ${tokenName}`
        );
        console.log(`   📈 Total Shares: ${poolData.totalShares.toString()}`);

        // Check if pool has enough liquidity for swaps
        const mntReserve = Number(ethers.formatEther(poolData.mntReserve));
        const tokenReserve = Number(ethers.formatEther(poolData.tokenReserve));

        if (mntReserve > 0 && tokenReserve > 0) {
          console.log(
            `   ✅ Pool has liquidity (ratio: 1 ${tokenName} = ${(mntReserve / tokenReserve).toFixed(4)} MNT)`
          );
        } else if (mntReserve === 0 && tokenReserve === 0) {
          console.log(`   ❌ Pool is empty - no liquidity added yet`);
        } else {
          console.log(`   ⚠️  Pool has unbalanced liquidity`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error reading pool: ${error.message}`);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("💡 LIQUIDITY RECOMMENDATIONS");
    console.log("=".repeat(50));

    console.log("\nTo fix missing USDT in portfolios:");
    console.log("1. Run the liquidity script to add USDT/MNT pool");
    console.log("2. Or manually add liquidity using addLiquidity()");
    console.log("3. Then try rebalancing existing portfolios");

    console.log("\nExample commands:");
    console.log(
      "   npx hardhat run scripts/setup-liquidity.ts --network mantleSepolia"
    );
    console.log("   npx hardhat run scripts/liquid.ts --network mantleSepolia");
  } catch (error: any) {
    console.log("❌ General Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




















