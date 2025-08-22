import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Adding small but realistic liquidity pools...\n");

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

    // Mint smaller amounts
    await wETH.mint(deployer.address, ethers.parseEther("100"));
    console.log("✅ wETH minted");

    await wBTC.mint(deployer.address, ethers.parseUnits("1", 8)); // 1 wBTC
    console.log("✅ wBTC minted");

    await usdt.mint(deployer.address, ethers.parseUnits("10000", 6)); // 10k USDT
    console.log("✅ USDT minted");

    await grandma.mint(deployer.address, ethers.parseEther("10000")); // 10k GRANDMA
    console.log("✅ GRANDMA minted");

    console.log("\n💧 Adding realistic but small liquidity pools...");

    // Use smaller amounts that maintain proper ratios but don't exceed account balance

    // Add USDT/MNT pool (1:1 ratio since both ~$1)
    console.log("   Adding USDT/MNT liquidity (1:1 ratio)...");
    await usdt.approve(
      ADDRESSES.PortfolioManager,
      ethers.parseUnits("1000", 6)
    );
    await portfolioManager.addLiquidity(
      ADDRESSES.USDT,
      ethers.parseUnits("1000", 6),
      {
        value: ethers.parseEther("1000"), // 1000 MNT for 1000 USDT
      }
    );
    console.log("✅ USDT/MNT liquidity added");

    // Add wBTC/MNT pool with smaller but proportional amounts
    // 1 BTC = ~120k MNT, so 0.01 BTC = ~1200 MNT
    console.log("   Adding wBTC/MNT liquidity (0.01 BTC : 1200 MNT)...");
    await wBTC.approve(
      ADDRESSES.PortfolioManager,
      ethers.parseUnits("0.01", 8)
    ); // 0.01 wBTC
    await portfolioManager.addLiquidity(
      ADDRESSES.wBTC,
      ethers.parseUnits("0.01", 8),
      {
        value: ethers.parseEther("1200"), // 1200 MNT for 0.01 wBTC
      }
    );
    console.log("✅ wBTC/MNT liquidity added");

    // Add GRANDMA/MNT pool (1:1 ratio)
    console.log("   Adding GRANDMA/MNT liquidity (1:1 ratio)...");
    await grandma.approve(ADDRESSES.PortfolioManager, ethers.parseEther("500"));
    await portfolioManager.addLiquidity(
      ADDRESSES.GRANDMA,
      ethers.parseEther("500"),
      {
        value: ethers.parseEther("500"), // 500 MNT for 500 GRANDMA
      }
    );
    console.log("✅ GRANDMA/MNT liquidity added");

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
            `   ${pool.name}: 1 ${pool.name} = ${ratio.toFixed(4)} MNT (Total: ${mntReserve.toFixed(2)} MNT, ${tokenReserve.toFixed(6)} ${pool.name})`
          );
        } else {
          console.log(`   ${pool.name}: No liquidity`);
        }
      } catch (error) {
        console.log(`   ${pool.name}: Error reading pool`);
      }
    }

    console.log("\n🎉 Realistic liquidity added!");
    console.log("\n🧪 Now test portfolio creation - USDT swaps should work!");
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
