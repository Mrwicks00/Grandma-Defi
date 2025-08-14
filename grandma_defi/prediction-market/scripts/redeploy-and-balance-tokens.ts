import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Redeploying tokens and setting up balanced pools...");

  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";

  // Price feeds from your list
  const PRICE_FEEDS = {
    MNT: "0x4c8962833Db7206fd45671e9DC806e4FcC0dCB78",
    wETH: "0x9bD31B110C559884c49d1bA3e60C1724F2E336a7",
    wBTC: "0xecC446a3219da4594d5Ede8314f500212e496E17",
    USDT: "0x71c184d899c1774d597d8D80526FB02dF708A69a",
    GRANDMA: "0x4c8962833Db7206fd45671e9DC806e4FcC0dCB78", // Using MNT feed since 1 GRANDMA ≈ 1 MNT
  };

  // Expected prices (from Chainlink feeds)
  const PRICES = {
    MNT: 1.01729282,
    wETH: 4278.2,
    wBTC: 118325.8,
    USDT: 0.99996984,
    GRANDMA: 1.01729282, // Same as MNT
  };

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "MNT");

  if (balance < ethers.parseEther("2000")) {
    console.log(
      "⚠️  Warning: You might need more MNT for liquidity (need ~1500 MNT)"
    );
  }

  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );

  // Step 1: Deploy new tokens
  console.log("\n📦 Step 1: Deploying new tokens...");

  console.log("Deploying wETH...");
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const wETH = await MockWETH.deploy();
  await wETH.waitForDeployment();
  const wETH_ADDRESS = await wETH.getAddress();
  console.log("✅ wETH deployed at:", wETH_ADDRESS);

  console.log("Deploying wBTC...");
  const MockWBTC = await ethers.getContractFactory("MockWBTC");
  const wBTC = await MockWBTC.deploy();
  await wBTC.waitForDeployment();
  const wBTC_ADDRESS = await wBTC.getAddress();
  console.log("✅ wBTC deployed at:", wBTC_ADDRESS);

  console.log("Deploying GRANDMA...");
  const GrandmaToken = await ethers.getContractFactory("GrandmaToken");
  const GRANDMA = await GrandmaToken.deploy();
  await GRANDMA.waitForDeployment();
  const GRANDMA_ADDRESS = await GRANDMA.getAddress();
  console.log("✅ GRANDMA deployed at:", GRANDMA_ADDRESS);

  // Step 2: Add tokens as supported
  console.log("\n🔧 Step 2: Adding tokens as supported...");

  const tokens = [
    {
      name: "wETH",
      address: wETH_ADDRESS,
      contract: wETH,
      priceFeed: PRICE_FEEDS.wETH,
    },
    {
      name: "wBTC",
      address: wBTC_ADDRESS,
      contract: wBTC,
      priceFeed: PRICE_FEEDS.wBTC,
    },
    {
      name: "GRANDMA",
      address: GRANDMA_ADDRESS,
      contract: GRANDMA,
      priceFeed: PRICE_FEEDS.GRANDMA,
    },
  ];

  for (const token of tokens) {
    console.log(`Adding ${token.name} as supported token...`);
    const tx = await PortfolioManager.addSupportedToken(
      token.address,
      token.priceFeed
    );
    await tx.wait();
    console.log(`✅ ${token.name} added as supported token`);
  }

  // Step 3: Mint tokens to deployer
  console.log("\n💰 Step 3: Minting tokens...");

  const MINT_AMOUNT = ethers.parseEther("10000"); // 10,000 tokens each

  for (const token of tokens) {
    console.log(`Minting ${token.name}...`);
    const tx = await token.contract.mint(deployer.address, MINT_AMOUNT);
    await tx.wait();
    console.log(`✅ Minted 10,000 ${token.name}`);
  }

  // Step 4: Add balanced liquidity
  console.log("\n💧 Step 4: Adding balanced liquidity (500 MNT per pool)...");

  const MNT_PER_POOL = ethers.parseEther("500");

  for (const token of tokens) {
    console.log(`\nAdding liquidity for ${token.name}...`);

    // Calculate token amount based on price ratio
    const priceRatio = PRICES[token.name as keyof typeof PRICES] / PRICES.MNT;
    const tokenAmount = ethers.parseEther((500 / priceRatio).toString());

    console.log(`  • MNT amount: 500 MNT`);
    console.log(
      `  • ${token.name} amount: ${ethers.formatEther(tokenAmount)} ${token.name}`
    );
    console.log(
      `  • Expected ratio: 1 ${token.name} = ${priceRatio.toFixed(6)} MNT`
    );

    // Approve token spending
    console.log(`  • Approving ${token.name}...`);
    const approveTx = await token.contract.approve(
      PORTFOLIO_MANAGER_ADDRESS,
      tokenAmount
    );
    await approveTx.wait();

    // Add liquidity
    console.log(`  • Adding liquidity...`);
    const liquidityTx = await PortfolioManager.addLiquidity(
      token.address,
      tokenAmount,
      { value: MNT_PER_POOL }
    );
    await liquidityTx.wait();
    console.log(`  ✅ Liquidity added for ${token.name}`);
  }

  // Step 5: Verify everything
  console.log("\n🔍 Step 5: Verifying setup...");

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

  console.log("\n🎉 TOKEN REDEPLOYMENT COMPLETED!");
  console.log("==================================================");
  console.log("📋 NEW TOKEN ADDRESSES:");
  console.log(`• wETH: ${wETH_ADDRESS}`);
  console.log(`• wBTC: ${wBTC_ADDRESS}`);
  console.log(`• GRANDMA: ${GRANDMA_ADDRESS}`);
  console.log("\n💡 Next steps:");
  console.log("1. Update your frontend config with these new addresses");
  console.log("2. Test portfolio creation with balanced pools");
  console.log("3. Portfolio values should now be accurate!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
