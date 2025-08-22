import { ethers } from "hardhat";

async function main() {
  console.log("🔄 Continuing liquidity setup from where we left off...");

  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";

  // Already deployed token addresses from the previous script
  const DEPLOYED_TOKENS = {
    wETH: "0x1e8a097E2942292264dFd840cE2328056Fec716c",
    wBTC: "0xcBe1f9dD7D64fce92Cf27B7E761cF0590a312DB8",
    GRANDMA: "0xC93F278471594324242F911Fb4343D9bC2e57Dbc",
  };

  // Price feeds
  const PRICE_FEEDS = {
    wETH: "0x9bD31B110C559884c49d1bA3e60C1724F2E336a7",
    wBTC: "0xecC446a3219da4594d5Ede8314f500212e496E17",
    GRANDMA: "0x4c8962833Db7206fd45671e9DC806e4FcC0dCB78",
  };

  // Expected prices
  const PRICES = {
    MNT: 1.01729282,
    wETH: 4278.2,
    wBTC: 118325.8,
    GRANDMA: 1.01729282,
  };

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );

  // Get contract instances
  const wETH = await ethers.getContractAt("MockWETH", DEPLOYED_TOKENS.wETH);
  const wBTC = await ethers.getContractAt("MockWBTC", DEPLOYED_TOKENS.wBTC);
  const GRANDMA = await ethers.getContractAt(
    "GrandmaToken",
    DEPLOYED_TOKENS.GRANDMA
  );

  console.log("\n✅ Using already deployed contracts:");
  console.log(`• wETH: ${DEPLOYED_TOKENS.wETH}`);
  console.log(`• wBTC: ${DEPLOYED_TOKENS.wBTC}`);
  console.log(`• GRANDMA: ${DEPLOYED_TOKENS.GRANDMA}`);

  // Check and set price feeds if needed
  console.log("\n🔧 Checking and setting price feeds...");

  const tokens = [
    {
      name: "wETH",
      address: DEPLOYED_TOKENS.wETH,
      contract: wETH,
      priceFeed: PRICE_FEEDS.wETH,
    },
    {
      name: "wBTC",
      address: DEPLOYED_TOKENS.wBTC,
      contract: wBTC,
      priceFeed: PRICE_FEEDS.wBTC,
    },
    {
      name: "GRANDMA",
      address: DEPLOYED_TOKENS.GRANDMA,
      contract: GRANDMA,
      priceFeed: PRICE_FEEDS.GRANDMA,
    },
  ];

  for (const token of tokens) {
    const currentPriceFeed = await PortfolioManager.priceFeeds(token.address);
    if (currentPriceFeed !== token.priceFeed) {
      console.log(`Setting price feed for ${token.name}...`);
      const tx = await PortfolioManager.setPriceFeed(
        token.address,
        token.priceFeed
      );
      await tx.wait();
      console.log(`✅ ${token.name} price feed set`);
    } else {
      console.log(`✅ ${token.name} price feed already correct`);
    }
  }

  // Continue adding liquidity (wETH was done, now do wBTC and GRANDMA)
  console.log("\n💧 Adding remaining liquidity...");

  const MNT_PER_POOL = ethers.parseEther("500");

  // For wBTC - use a more reasonable amount (avoid tiny decimals)
  console.log("\nAdding liquidity for wBTC...");
  const wbtcPriceRatio = PRICES.wBTC / PRICES.MNT;
  // Instead of tiny amount, let's use 50 MNT worth to get a reasonable wBTC amount
  const wbtcMntAmount = ethers.parseEther("50");
  const wbtcTokenAmount = ethers.parseEther((50 / wbtcPriceRatio).toFixed(18));

  console.log(`  • MNT amount: 50 MNT (smaller pool for wBTC)`);
  console.log(`  • wBTC amount: ${ethers.formatEther(wbtcTokenAmount)} wBTC`);
  console.log(`  • Expected ratio: 1 wBTC = ${wbtcPriceRatio.toFixed(6)} MNT`);

  console.log(`  • Approving wBTC...`);
  const wbtcApproveTx = await wBTC.approve(
    PORTFOLIO_MANAGER_ADDRESS,
    wbtcTokenAmount
  );
  await wbtcApproveTx.wait();

  console.log(`  • Adding wBTC liquidity...`);
  const wbtcLiquidityTx = await PortfolioManager.addLiquidity(
    DEPLOYED_TOKENS.wBTC,
    wbtcTokenAmount,
    { value: wbtcMntAmount }
  );
  await wbtcLiquidityTx.wait();
  console.log(`  ✅ wBTC liquidity added`);

  // For GRANDMA - 1:1 ratio should be fine
  console.log("\nAdding liquidity for GRANDMA...");
  const grandmaPriceRatio = PRICES.GRANDMA / PRICES.MNT;
  const grandmaTokenAmount = ethers.parseEther(
    (500 / grandmaPriceRatio).toString()
  );

  console.log(`  • MNT amount: 500 MNT`);
  console.log(
    `  • GRANDMA amount: ${ethers.formatEther(grandmaTokenAmount)} GRANDMA`
  );
  console.log(
    `  • Expected ratio: 1 GRANDMA = ${grandmaPriceRatio.toFixed(6)} MNT`
  );

  console.log(`  • Approving GRANDMA...`);
  const grandmaApproveTx = await GRANDMA.approve(
    PORTFOLIO_MANAGER_ADDRESS,
    grandmaTokenAmount
  );
  await grandmaApproveTx.wait();

  console.log(`  • Adding GRANDMA liquidity...`);
  const grandmaLiquidityTx = await PortfolioManager.addLiquidity(
    DEPLOYED_TOKENS.GRANDMA,
    grandmaTokenAmount,
    { value: MNT_PER_POOL }
  );
  await grandmaLiquidityTx.wait();
  console.log(`  ✅ GRANDMA liquidity added`);

  // Verify everything
  console.log("\n🔍 Final verification...");

  for (const token of tokens) {
    console.log(`\n📊 ${token.name} Status:`);

    // Check if supported
    const isSupported = await PortfolioManager.isTokenSupported(token.address);
    console.log(`  • Supported: ${isSupported ? "✅" : "❌"}`);

    // Check price feed
    const priceFeed = await PortfolioManager.priceFeeds(token.address);
    console.log(`  • Price Feed: ${priceFeed}`);

    // Check price
    try {
      const price = await PortfolioManager.getTokenPrice(token.address);
      console.log(`  • Price: $${(Number(price) / 1e8).toFixed(8)}`);
    } catch (error) {
      console.log(`  • Price: ❌ Error getting price`);
    }

    // Check pool
    try {
      const poolData = await PortfolioManager.liquidityPools(token.address);
      const [mntReserve, tokenReserve] = poolData;
      const mntAmount = Number(ethers.formatEther(mntReserve));
      const tokenAmount = Number(ethers.formatEther(tokenReserve));
      const ratio = mntAmount / tokenAmount;

      console.log(
        `  • Pool: ${mntAmount.toFixed(2)} MNT / ${tokenAmount.toFixed(6)} ${token.name}`
      );
      console.log(`  • Ratio: 1 ${token.name} = ${ratio.toFixed(6)} MNT`);
    } catch (error) {
      console.log(`  • Pool: ❌ Error reading pool`);
    }
  }

  console.log("\n🎉 SETUP COMPLETED!");
  console.log("==================================================");
  console.log("📋 FINAL TOKEN ADDRESSES:");
  console.log(`• wETH: ${DEPLOYED_TOKENS.wETH}`);
  console.log(`• wBTC: ${DEPLOYED_TOKENS.wBTC}`);
  console.log(`• GRANDMA: ${DEPLOYED_TOKENS.GRANDMA}`);
  console.log("\n💡 Next steps:");
  console.log("1. Update your frontend config with these new addresses");
  console.log("2. Test portfolio creation - values should now be accurate!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });














