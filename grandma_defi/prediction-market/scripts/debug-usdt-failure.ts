import { ethers } from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("🔍 Debugging Why USDT Swaps Keep Failing\n");

  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = PortfolioManager.attach(
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1"
  );

  console.log("🎯 USDT SWAP FAILURE INVESTIGATION");
  console.log("=".repeat(50), "\n");

  try {
    // 1. Check USDT liquidity pool
    console.log("1️⃣ USDT LIQUIDITY POOL STATUS:");
    const usdtPool = await portfolioManager.liquidityPools(
      "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F"
    );

    console.log(`   MNT Reserve: ${formatEther(usdtPool.mntReserve)} MNT`);
    console.log(
      `   USDT Reserve: ${(Number(usdtPool.tokenReserve) / 1e6).toFixed(6)} USDT`
    );
    console.log(`   Total Shares: ${usdtPool.totalShares.toString()}`);

    const hasLiquidity =
      Number(usdtPool.mntReserve) > 0 && Number(usdtPool.tokenReserve) > 0;
    console.log(`   Has Liquidity: ${hasLiquidity ? "✅ YES" : "❌ NO"}\n`);

    if (hasLiquidity) {
      const ratio =
        Number(usdtPool.mntReserve) / (Number(usdtPool.tokenReserve) / 1e6);
      console.log(`   Pool Ratio: 1 USDT = ${ratio.toFixed(2)} MNT`);
    }

    // 2. Check USDT price from oracle
    console.log("2️⃣ USDT PRICE FEED:");
    const usdtPrice = await portfolioManager.getTokenPrice(
      "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F"
    );
    const usdtPriceUSD = Number(usdtPrice) / 1e8;
    console.log(`   Oracle Price: $${usdtPriceUSD.toFixed(6)} USD`);
    console.log(
      `   Price looks reasonable: ${usdtPriceUSD > 0.5 && usdtPriceUSD < 2 ? "✅ YES" : "❌ NO"}\n`
    );

    // 3. Check if USDT token exists and is accessible
    console.log("3️⃣ USDT TOKEN CONTRACT:");
    const provider = ethers.provider;

    try {
      const usdtCode = await provider.getCode(
        "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F"
      );
      console.log(
        `   Contract exists: ${usdtCode !== "0x" ? "✅ YES" : "❌ NO"}`
      );

      if (usdtCode !== "0x") {
        // Try to read USDT decimals
        const ERC20_ABI = [
          "function decimals() view returns (uint8)",
          "function symbol() view returns (string)",
          "function totalSupply() view returns (uint256)",
        ];

        const usdtContract = new ethers.Contract(
          "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F",
          ERC20_ABI,
          provider
        );

        const decimals = await usdtContract.decimals();
        const symbol = await usdtContract.symbol();
        const totalSupply = await usdtContract.totalSupply();

        console.log(`   Symbol: ${symbol}`);
        console.log(`   Decimals: ${decimals}`);
        console.log(
          `   Total Supply: ${(Number(totalSupply) / Math.pow(10, decimals)).toFixed(2)} ${symbol}`
        );
      }
    } catch (error) {
      console.log(`   ❌ Error reading USDT contract: ${error.message}`);
    }
    console.log("");

    // 4. Simulate a small USDT swap to see what happens
    console.log("4️⃣ USDT SWAP SIMULATION:");

    if (hasLiquidity) {
      const swapAmountMNT = 1; // Try to swap 1 MNT for USDT
      const mntReserve = Number(usdtPool.mntReserve);
      const usdtReserve = Number(usdtPool.tokenReserve) / 1e6;

      // Calculate AMM output using x*y=k formula
      const newMntReserve = mntReserve + swapAmountMNT;
      const newUsdtReserve = (mntReserve * usdtReserve) / newMntReserve;
      const usdtOutput = usdtReserve - newUsdtReserve;

      console.log(`   Trying to swap: ${swapAmountMNT} MNT → USDT`);
      console.log(`   Expected output: ${usdtOutput.toFixed(6)} USDT`);
      console.log(
        `   Output reasonable: ${usdtOutput > 0 && usdtOutput < 1000 ? "✅ YES" : "❌ NO"}`
      );

      if (usdtOutput <= 0) {
        console.log(`   🚨 PROBLEM: Swap would produce zero or negative USDT!`);
      }
      if (usdtOutput > usdtReserve) {
        console.log(`   🚨 PROBLEM: Swap would drain the entire pool!`);
      }
    } else {
      console.log(`   ❌ Cannot simulate swap - no liquidity in pool`);
    }
    console.log("");

    // 5. Check portfolio creation transaction for clues
    console.log("5️⃣ POSSIBLE FAILURE REASONS:");

    if (!hasLiquidity) {
      console.log(`   🚨 PRIMARY ISSUE: USDT pool has no liquidity!`);
      console.log(`   💡 Solution: Add USDT/MNT liquidity to the pool`);
    } else {
      const ratio =
        Number(usdtPool.mntReserve) / (Number(usdtPool.tokenReserve) / 1e6);
      if (ratio > 10000) {
        console.log(
          `   🚨 ISSUE: USDT pool ratio is broken (1 USDT = ${ratio.toFixed(0)} MNT)`
        );
        console.log(`   💡 This makes USDT impossibly expensive to buy`);
      }

      if (Number(usdtPool.tokenReserve) < 1000) {
        // Less than 0.001 USDT
        console.log(`   🚨 ISSUE: USDT pool has insufficient token reserves`);
        console.log(
          `   💡 Pool only has ${(Number(usdtPool.tokenReserve) / 1e6).toFixed(6)} USDT`
        );
      }
    }

    console.log("");
    console.log("6️⃣ RECOMMENDED FIXES:");
    console.log("   1. Add proper USDT/MNT liquidity to the pool");
    console.log("   2. Set realistic USDT/MNT ratio (1 USDT ≈ 1 MNT)");
    console.log("   3. Ensure sufficient USDT reserves for swaps");
    console.log("   4. Check for any AMM swap function bugs");
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













