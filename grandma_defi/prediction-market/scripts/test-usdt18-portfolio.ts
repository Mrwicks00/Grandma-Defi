import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing USDT18 portfolio creation...");

  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";
  const USDT18_ADDRESS = "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf";

  const [deployer] = await ethers.getSigners();
  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );

  // Test simple MNT + USDT18 portfolio
  const tokens = [
    "0x0000000000000000000000000000000000000000", // MNT
    USDT18_ADDRESS, // USDT18
  ];

  const allocations = [8000, 2000]; // 80% MNT, 20% USDT18
  const value = ethers.parseEther("10"); // 10 MNT

  console.log("Creating MNT + USDT18 portfolio...");
  console.log("Tokens:", tokens);
  console.log("Allocations:", allocations, "(80%, 20%)");
  console.log("Value:", ethers.formatEther(value), "MNT");

  try {
    const tx = await PortfolioManager.createPortfolio(
      tokens,
      allocations,
      500, // 5% rebalance threshold
      { value }
    );

    console.log("✅ Success! Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ Portfolio created with USDT18!");
  } catch (error) {
    console.log("❌ Failed:", error);

    // Let's also test if the issue is with the price feed
    console.log("\n🔍 Testing price feeds...");
    try {
      const usdtPrice = await PortfolioManager.getTokenPrice(USDT18_ADDRESS);
      console.log("USDT18 price:", usdtPrice.toString());
    } catch (priceError) {
      console.log("❌ Price feed error:", priceError);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


