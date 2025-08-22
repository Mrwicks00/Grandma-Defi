import { ethers } from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log(
    "🔧 Fixing AMM pool ratios (small amounts) to match Chainlink prices...\n"
  );

  // Get contract instances
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = PortfolioManager.attach(
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1"
  );

  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const tokenFactory = TokenFactory.attach(
    "0x118B873495387990eA7E2FF5b8479381f778a5Be"
  );

  const [deployer] = await ethers.getSigners();
  console.log("🔑 Account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", formatEther(balance), "MNT\n");

  // Get current Chainlink prices for ratio calculation
  console.log("📊 Getting Chainlink prices for ratio calculation...");

  const mntPrice = await portfolioManager.getTokenPrice(
    "0x0000000000000000000000000000000000000000"
  );
  const wethPrice = await portfolioManager.getTokenPrice(
    "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece"
  );
  const usdtPrice = await portfolioManager.getTokenPrice(
    "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F"
  );
  const grandmaPrice = await portfolioManager.getTokenPrice(
    "0xF57464e2cCfbB909dE54D52d1B9B4847E2bE38b0"
  );

  console.log(`   MNT: $${(Number(mntPrice) / 1e8).toFixed(2)}`);
  console.log(`   wETH: $${(Number(wethPrice) / 1e8).toFixed(2)}`);
  console.log(`   USDT: $${(Number(usdtPrice) / 1e8).toFixed(2)}`);
  console.log(`   GRANDMA: $${(Number(grandmaPrice) / 1e8).toFixed(2)}\n`);

  // Calculate proper ratios (how much MNT each token should be worth)
  const mntPerWeth = Number(wethPrice) / Number(mntPrice); // ~4,318 MNT per wETH
  const mntPerUsdt = Number(usdtPrice) / Number(mntPrice); // ~1.02 MNT per USDT
  const mntPerGrandma = Number(grandmaPrice) / Number(mntPrice); // ~1.02 MNT per GRANDMA

  console.log("🎯 Target ratios based on Chainlink prices:");
  console.log(`   1 wETH should = ${mntPerWeth.toFixed(2)} MNT`);
  console.log(`   1 USDT should = ${mntPerUsdt.toFixed(4)} MNT`);
  console.log(`   1 GRANDMA should = ${mntPerGrandma.toFixed(4)} MNT\n`);

  // Use smaller amounts that fit budget
  console.log("💰 Using smaller amounts to fit your budget...\n");

  // Small wETH pool - use only 0.5 wETH to fit budget
  const wethAmount = parseEther("0.5"); // 0.5 wETH
  const mntForWeth = parseEther((mntPerWeth * 0.5).toString()); // Equivalent MNT

  // Small USDT pool
  const usdtAmountActual = BigInt(500 * 1e6); // 500 USDT with 6 decimals
  const mntForUsdt = parseEther((mntPerUsdt * 500).toString()); // Equivalent MNT

  // Small GRANDMA pool
  const grandmaAmount = parseEther("500.0"); // 500 GRANDMA
  const mntForGrandma = parseEther((mntPerGrandma * 500).toString()); // Equivalent MNT

  console.log("📝 Planned liquidity additions:");
  console.log(
    `   wETH: ${formatEther(wethAmount)} wETH + ${formatEther(mntForWeth)} MNT`
  );
  console.log(
    `   USDT: ${Number(usdtAmountActual) / 1e6} USDT + ${formatEther(mntForUsdt)} MNT`
  );
  console.log(
    `   GRANDMA: ${formatEther(grandmaAmount)} GRANDMA + ${formatEther(mntForGrandma)} MNT`
  );
  console.log(
    `   Total MNT needed: ${formatEther(mntForWeth + mntForUsdt + mntForGrandma)} MNT\n`
  );

  // Check if we have enough MNT
  const totalMntNeeded = mntForWeth + mntForUsdt + mntForGrandma;
  if (Number(balance) < Number(totalMntNeeded)) {
    console.log("⚠️ Warning: Might not have enough MNT for all pools");
    console.log(`   Available: ${formatEther(balance)} MNT`);
    console.log(`   Needed: ${formatEther(totalMntNeeded)} MNT\n`);
  }

  // Mint tokens first
  console.log("🪙 Minting tokens...");
  try {
    await tokenFactory.mintTokens(
      deployer.address,
      wethAmount,
      parseEther("0.1"), // Small wBTC (won't use)
      usdtAmountActual,
      grandmaAmount
    );
    console.log("✅ Tokens minted successfully\n");
  } catch (error) {
    console.log("⚠️ Token minting failed, they might already be minted\n");
  }

  // Add liquidity with proper ratios
  console.log("💧 Adding liquidity with Chainlink-based ratios...\n");

  // wETH/MNT pool with proper ratio
  try {
    console.log(
      `   Adding wETH/MNT: ${formatEther(wethAmount)} wETH + ${formatEther(mntForWeth)} MNT`
    );
    const tx1 = await portfolioManager.addLiquidity(
      "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece", // wETH
      wethAmount,
      { value: mntForWeth }
    );
    await tx1.wait();
    console.log("✅ wETH/MNT liquidity added with proper ratio!");
  } catch (error) {
    console.log("❌ wETH liquidity failed:", error.message);
  }

  // USDT/MNT pool with proper ratio
  try {
    console.log(
      `   Adding USDT/MNT: ${Number(usdtAmountActual) / 1e6} USDT + ${formatEther(mntForUsdt)} MNT`
    );
    const tx2 = await portfolioManager.addLiquidity(
      "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F", // USDT
      usdtAmountActual,
      { value: mntForUsdt }
    );
    await tx2.wait();
    console.log("✅ USDT/MNT liquidity added with proper ratio!");
  } catch (error) {
    console.log("❌ USDT liquidity failed:", error.message);
  }

  // GRANDMA/MNT pool with proper ratio
  try {
    console.log(
      `   Adding GRANDMA/MNT: ${formatEther(grandmaAmount)} GRANDMA + ${formatEther(mntForGrandma)} MNT`
    );
    const tx3 = await portfolioManager.addLiquidity(
      "0xF57464e2cCfbB909dE54D52d1B9B4847E2bE38b0", // GRANDMA
      grandmaAmount,
      { value: mntForGrandma }
    );
    await tx3.wait();
    console.log("✅ GRANDMA/MNT liquidity added with proper ratio!");
  } catch (error) {
    console.log("❌ GRANDMA liquidity failed:", error.message);
  }

  console.log("\n🎉 Pool ratio fixing complete!");
  console.log("\n💡 Next steps:");
  console.log("   1. Run check-liquidity.ts to verify new ratios");
  console.log("   2. Test portfolio creation/rebalancing");
  console.log("   3. Check if swaps now use realistic ratios");
  console.log("\n✨ Your AMM pools should now match real market prices!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
