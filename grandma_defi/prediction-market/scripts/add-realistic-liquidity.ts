import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Adding realistic liquidity pools...\n");

  const ADDRESSES = {
    PortfolioManager: "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1",
    wETH: "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece",
    wBTC: "0x741986AFAB100Ec4ac2C25a5DD47C35d33f53995",
    USDT: "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F",
    GRANDMA: "0xF57464e2cCfbB909dE54D52d1B9B4847E2bE38b0",
  };

  const [deployer] = await ethers.getSigners();
  console.log("🔑 Account:", deployer.address);

  // Get contract instances
  const portfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    ADDRESSES.PortfolioManager
  );
  const wETH = await ethers.getContractAt("MockWETH", ADDRESSES.wETH);
  const wBTC = await ethers.getContractAt("MockWBTC", ADDRESSES.wBTC);
  const usdt = await ethers.getContractAt("MockUSDT", ADDRESSES.USDT);
  const grandma = await ethers.getContractAt("GrandmaToken", ADDRESSES.GRANDMA);

  try {
    console.log("🪙 Minting tokens for liquidity...");

    // Mint tokens to deployer first
    await wETH.mint(deployer.address, ethers.parseEther("1000"));
    console.log("✅ wETH minted");

    await wBTC.mint(deployer.address, ethers.parseUnits("10", 8)); // 10 wBTC
    console.log("✅ wBTC minted");

    await usdt.mint(deployer.address, ethers.parseUnits("100000", 6)); // 100k USDT
    console.log("✅ USDT minted");

    await grandma.mint(deployer.address, ethers.parseEther("100000")); // 100k GRANDMA
    console.log("✅ GRANDMA minted");

    console.log("\n💧 Adding realistic liquidity pools...");

    // Current prices (roughly):
    // MNT ≈ $1, ETH ≈ $4300, BTC ≈ $120k, USDT ≈ $1, GRANDMA ≈ $1

    // Add USDT/MNT pool (1:1 ratio since both ~$1)
    console.log("   Adding USDT/MNT liquidity (1:1 ratio)...");
    await usdt.approve(
      ADDRESSES.PortfolioManager,
      ethers.parseUnits("3000", 6)
    );
    await portfolioManager.addLiquidity(
      ADDRESSES.USDT,
      ethers.parseUnits("3000", 6),
      {
        value: ethers.parseEther("3000"), // 3000 MNT for 3000 USDT
      }
    );
    console.log("✅ USDT/MNT liquidity added");

    // Add wBTC/MNT pool (1 BTC = ~120,000 MNT)
    console.log("   Adding wBTC/MNT liquidity (1:120000 ratio)...");
    await wBTC.approve(ADDRESSES.PortfolioManager, ethers.parseUnits("1", 8)); // 1 wBTC
    await portfolioManager.addLiquidity(
      ADDRESSES.wBTC,
      ethers.parseUnits("1", 8),
      {
        value: ethers.parseEther("120000"), // 120k MNT for 1 wBTC
      }
    );
    console.log("✅ wBTC/MNT liquidity added");

    // Add GRANDMA/MNT pool (1:1 ratio, treat GRANDMA as $1)
    console.log("   Adding GRANDMA/MNT liquidity (1:1 ratio)...");
    await grandma.approve(
      ADDRESSES.PortfolioManager,
      ethers.parseEther("5000")
    );
    await portfolioManager.addLiquidity(
      ADDRESSES.GRANDMA,
      ethers.parseEther("5000"),
      {
        value: ethers.parseEther("5000"), // 5000 MNT for 5000 GRANDMA
      }
    );
    console.log("✅ GRANDMA/MNT liquidity added");

    console.log("\n🧪 Testing liquidity pools...");

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
            `   ${pool.name}: 1 ${pool.name} = ${ratio.toFixed(4)} MNT`
          );
        } else {
          console.log(`   ${pool.name}: No liquidity`);
        }
      } catch (error) {
        console.log(`   ${pool.name}: Error reading pool`);
      }
    }

    console.log("\n🎉 Realistic liquidity added! Now try:");
    console.log(
      "   npx hardhat run scripts/check-prices.ts --network mantleSepolia"
    );
    console.log("   Then test portfolio creation in your UI!");
  } catch (error: any) {
    console.log("❌ Error:", error.message);
    console.log("Full error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });








