import { ethers } from "hardhat";

async function main() {
  console.log("💧 Checking current liquidity pools (including new USDT18)...");

  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";

  // Current token addresses
  const TOKENS = {
    wETH: "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece",
    wBTC: "0x741986AFAB100Ec4ac2C25a5DD47C35d33f53995",
    USDT_OLD: "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F",
    USDT18: "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf", // New USDT18
    GRANDMA: "0xF57464e2cCfbB909dE54D52d1B9B4847E2bE38b0",
  };

  // Expected real-world prices (from Chainlink)
  const REAL_PRICES = {
    MNT: 1.01729282,
    wETH: 4278.2,
    wBTC: 118325.8,
    USDT18: 0.99996984,
    USDT_OLD: 0.99996984,
    GRANDMA: 0.99996984,
  };

  const [deployer] = await ethers.getSigners();
  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );

  console.log("\n📊 CURRENT POOL STATES");
  console.log("==================================================");

  for (const [tokenName, tokenAddress] of Object.entries(TOKENS)) {
    try {
      // Try to get pool reserves by calling liquidityPools mapping
      const poolData = await PortfolioManager.liquidityPools(tokenAddress);
      const [mntReserve, tokenReserve, totalShares] = poolData;

      if (mntReserve > 0 || tokenReserve > 0) {
        const mntAmount = Number(ethers.formatEther(mntReserve));
        const tokenAmount = Number(ethers.formatEther(tokenReserve));

        console.log(`\n🔸 ${tokenName} Pool:`);
        console.log(`   💰 MNT Reserve: ${mntAmount.toFixed(6)} MNT`);
        console.log(
          `   🪙 Token Reserve: ${tokenAmount.toFixed(6)} ${tokenName}`
        );
        console.log(`   📈 Total Shares: ${ethers.formatEther(totalShares)}`);

        if (tokenAmount > 0) {
          const poolRatio = mntAmount / tokenAmount;
          console.log(
            `   ⚖️  Pool Ratio: 1 ${tokenName} = ${poolRatio.toFixed(6)} MNT`
          );

          // Calculate what the ratio should be based on real prices
          const realPrice = REAL_PRICES[tokenName as keyof typeof REAL_PRICES];
          if (realPrice) {
            const expectedRatio = realPrice / REAL_PRICES.MNT;
            console.log(
              `   🎯 Expected Ratio: 1 ${tokenName} = ${expectedRatio.toFixed(6)} MNT`
            );

            const discrepancy =
              ((poolRatio - expectedRatio) / expectedRatio) * 100;
            if (Math.abs(discrepancy) > 5) {
              console.log(
                `   🚨 IMBALANCE: ${discrepancy > 0 ? "+" : ""}${discrepancy.toFixed(1)}% off`
              );
            } else {
              console.log(`   ✅ BALANCED: Within 5% of expected ratio`);
            }
          }
        } else {
          console.log(`   ❌ No token reserves`);
        }
      } else {
        console.log(`\n🔸 ${tokenName} Pool: No liquidity`);
      }
    } catch (error) {
      console.log(`\n🔸 ${tokenName} Pool: Error reading data`);
    }
  }

  console.log("\n==================================================");
  console.log("💡 POOL ANALYSIS SUMMARY");
  console.log("==================================================");
  console.log(
    "• Pools with major imbalances will cause incorrect portfolio valuations"
  );
  console.log(
    "• AMM uses pool ratios for swaps, but Chainlink prices for USD values"
  );
  console.log("• This mismatch creates the $42 vs $30 portfolio value issue");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });














