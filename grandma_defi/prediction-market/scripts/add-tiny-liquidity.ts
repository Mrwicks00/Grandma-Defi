import { ethers } from "hardhat";

async function main() {
  console.log(
    "🔧 Adding tiny but realistic liquidity pools (budget: ~300 MNT)...\n"
  );

  const ADDRESSES = {
    PortfolioManager: "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1",
    wETH: "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece",
    wBTC: "0x741986AFAB100Ec4ac2C25a5DD47C35d33f53995",
    USDT: "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F",
    GRANDMA: "0xF57464e2cCfbB909dE54D52d1B9B4847E2bE38b0",
  };

  const [deployer] = await ethers.getSigners();
  console.log("🔑 Account:", deployer.address);

  // Check balance first
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MNT");

  // Only use 200 MNT total (leave 100+ for gas and future transactions)
  const totalBudget = ethers.parseEther("200");
  console.log(
    "💎 Budget for liquidity:",
    ethers.formatEther(totalBudget),
    "MNT"
  );

  // Get contract instances
  const portfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    ADDRESSES.PortfolioManager
  );
  const usdt = await ethers.getContractAt("MockUSDT", ADDRESSES.USDT);
  const grandma = await ethers.getContractAt("GrandmaToken", ADDRESSES.GRANDMA);

  try {
    console.log("🪙 Minting minimal tokens for liquidity...");

    // Mint just enough tokens
    await usdt.mint(deployer.address, ethers.parseUnits("100", 6)); // 100 USDT
    console.log("✅ 100 USDT minted");

    await grandma.mint(deployer.address, ethers.parseEther("100")); // 100 GRANDMA
    console.log("✅ 100 GRANDMA minted");

    console.log("\n💧 Adding tiny liquidity pools...");

    // Strategy: Use tiny amounts but maintain correct ratios
    // Total budget: 200 MNT split between 2 pools = 100 MNT each

    // Pool 1: USDT/MNT (1:1 ratio since both ~$1)
    console.log("   Adding USDT/MNT liquidity (50 USDT : 50 MNT)...");
    await usdt.approve(ADDRESSES.PortfolioManager, ethers.parseUnits("50", 6));
    await portfolioManager.addLiquidity(
      ADDRESSES.USDT,
      ethers.parseUnits("50", 6),
      {
        value: ethers.parseEther("50"), // 50 MNT for 50 USDT
      }
    );
    console.log("✅ USDT/MNT liquidity added");

    // Pool 2: GRANDMA/MNT (1:1 ratio, treat GRANDMA as $1)
    console.log("   Adding GRANDMA/MNT liquidity (50 GRANDMA : 50 MNT)...");
    await grandma.approve(ADDRESSES.PortfolioManager, ethers.parseEther("50"));
    await portfolioManager.addLiquidity(
      ADDRESSES.GRANDMA,
      ethers.parseEther("50"),
      {
        value: ethers.parseEther("50"), // 50 MNT for 50 GRANDMA
      }
    );
    console.log("✅ GRANDMA/MNT liquidity added");

    // Skip wBTC for now - too expensive (would need ~120k MNT for 1 BTC)
    console.log("   ⏭️  Skipping wBTC (too expensive for current budget)");

    console.log("\n🧪 Testing new liquidity pools...");

    // Check new pool ratios
    const pools = [
      { name: "wETH", address: ADDRESSES.wETH },
      { name: "wBTC", address: ADDRESSES.wBTC },
      { name: "USDT", address: ADDRESSES.USDT },
      { name: "GRANDMA", address: ADDRESSES.GRANDMA },
    ];

    for (const pool of pools) {
      try {
        const poolData = await portfolioManager.liquidityPools(pool.address);
        const mntReserve = Number(ethers.formatEther(poolData.mntReserve));
        const tokenReserve = Number(ethers.formatEther(poolData.tokenReserve));

        if (mntReserve > 0 && tokenReserve > 0) {
          const ratio = mntReserve / tokenReserve;
          console.log(
            `   ${pool.name}: 1 ${pool.name} = ${ratio.toFixed(4)} MNT (${mntReserve.toFixed(2)} MNT total)`
          );
        } else {
          console.log(`   ${pool.name}: No liquidity`);
        }
      } catch (error) {
        console.log(`   ${pool.name}: Error reading pool`);
      }
    }

    // Check remaining balance
    const newBalance = await ethers.provider.getBalance(deployer.address);
    console.log(
      "\n💰 Remaining balance:",
      ethers.formatEther(newBalance),
      "MNT"
    );

    console.log("\n🎉 Budget-friendly liquidity added!");
    console.log("✅ USDT swaps should now work in portfolios");
    console.log("✅ GRANDMA swaps should now work in portfolios");
    console.log("⚠️  wBTC swaps may still fail (no liquidity)");
    console.log("⚠️  wETH uses existing liquidity");

    console.log("\n🧪 Now test portfolio creation:");
    console.log('   "Create balanced portfolio with 5 MNT from wallet 1"');
  } catch (error: any) {
    console.log("❌ Error:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.log("💡 Try reducing the liquidity amounts even further");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });














