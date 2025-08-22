import { ethers } from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log("🔧 Fixing AMM pool ratios to match Chainlink prices...\n");

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
  const wbtcPrice = await portfolioManager.getTokenPrice(
    "0x741986AFAB100Ec4ac2C25a5DD47C35d33f53995"
  );
  const usdtPrice = await portfolioManager.getTokenPrice(
    "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F"
  );
  const grandmaPrice = await portfolioManager.getTokenPrice(
    "0xF57464e2cCfbB909dE54D52d1B9B4847E2bE38b0"
  );

  console.log(`   MNT: $${(Number(mntPrice) / 1e8).toFixed(2)}`);
  console.log(`   wETH: $${(Number(wethPrice) / 1e8).toFixed(2)}`);
  console.log(`   wBTC: $${(Number(wbtcPrice) / 1e8).toFixed(2)}`);
  console.log(`   USDT: $${(Number(usdtPrice) / 1e8).toFixed(2)}`);
  console.log(`   GRANDMA: $${(Number(grandmaPrice) / 1e8).toFixed(2)}\n`);

  // Calculate proper ratios (how much MNT each token should be worth)
  const mntPerWeth = Number(wethPrice) / Number(mntPrice); // ~4,310 MNT per wETH
  const mntPerWbtc = Number(wbtcPrice) / Number(mntPrice); // ~121,000 MNT per wBTC
  const mntPerUsdt = Number(usdtPrice) / Number(mntPrice); // ~1.02 MNT per USDT
  const mntPerGrandma = Number(grandmaPrice) / Number(mntPrice); // ~1.02 MNT per GRANDMA

  console.log("🎯 Target ratios based on Chainlink prices:");
  console.log(`   1 wETH should = ${mntPerWeth.toFixed(2)} MNT`);
  console.log(`   1 wBTC should = ${mntPerWbtc.toFixed(2)} MNT`);
  console.log(`   1 USDT should = ${mntPerUsdt.toFixed(4)} MNT`);
  console.log(`   1 GRANDMA should = ${mntPerGrandma.toFixed(4)} MNT\n`);

  // Mint tokens first
  console.log("🪙 Minting tokens for proper ratio liquidity...");

  const wethAmount = parseEther("1.0"); // 1 wETH
  const mntForWeth = parseEther((mntPerWeth * 1.0).toString()); // Equivalent MNT

  const wbtcAmount = parseEther("0.01"); // 0.01 wBTC
  const mntForWbtc = parseEther((mntPerWbtc * 0.01).toString()); // Equivalent MNT

  const usdtAmount = parseEther("1000.0"); // 1000 USDT (but 6 decimals, so adjust)
  const usdtAmountActual = BigInt(1000 * 1e6); // 1000 USDT with 6 decimals
  const mntForUsdt = parseEther((mntPerUsdt * 1000).toString()); // Equivalent MNT

  const grandmaAmount = parseEther("1000.0"); // 1000 GRANDMA
  const mntForGrandma = parseEther((mntPerGrandma * 1000).toString()); // Equivalent MNT

  try {
    await tokenFactory.mintTokens(
      deployer.address,
      wethAmount,
      wbtcAmount,
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
    console.log("✅ wETH/MNT liquidity added");
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
    console.log("✅ USDT/MNT liquidity added");
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
    console.log("✅ GRANDMA/MNT liquidity added");
  } catch (error) {
    console.log("❌ GRANDMA liquidity failed:", error.message);
  }

  // Skip wBTC for now due to high value requirement
  console.log("\n⚠️ Skipping wBTC pool (requires too much MNT)");
  console.log(`   Would need: ${formatEther(mntForWbtc)} MNT for 0.01 wBTC\n`);

  console.log("🎉 Pool ratio fixing complete!");
  console.log("\n💡 Next steps:");
  console.log("   1. Run check-liquidity.ts to verify new ratios");
  console.log("   2. Test portfolio creation/rebalancing");
  console.log("   3. Check if USDT swaps now work properly");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
