import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Fixing USDT18 price feed...");

  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";
  const USDT18_ADDRESS = "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf";

  // Use the working USDT price feed from deployment.json
  const WORKING_USDT_PRICE_FEED = "0xd86048D5e4fe96157CE03Ae519A9045bEDaa6551"; // From deployment.json

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );

  // Check current price feed
  console.log("\n📋 Current USDT18 price feed setup:");
  try {
    const currentPriceFeed = await PortfolioManager.priceFeeds(USDT18_ADDRESS);
    console.log("Current price feed:", currentPriceFeed);

    // Try to get price with current feed
    try {
      const price = await PortfolioManager.getTokenPrice(USDT18_ADDRESS);
      console.log("✅ Current price works:", price.toString());
    } catch (error) {
      console.log("❌ Current price feed doesn't work");
    }
  } catch (error) {
    console.log("❌ Error checking current setup:", error);
  }

  // Update the price feed
  console.log("\n🔧 Updating USDT18 price feed...");
  console.log("New price feed address:", WORKING_USDT_PRICE_FEED);

  try {
    const tx = await PortfolioManager.setPriceFeed(
      USDT18_ADDRESS,
      WORKING_USDT_PRICE_FEED
    );
    console.log("Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    await tx.wait();
    console.log("✅ Price feed updated successfully!");

    // Test the new price feed
    console.log("\n🧪 Testing new price feed...");
    const newPrice = await PortfolioManager.getTokenPrice(USDT18_ADDRESS);
    console.log("✅ New price:", newPrice.toString());
    console.log("💵 Price in USD:", (Number(newPrice) / 1e8).toFixed(8));

    // Verify price feed address
    const updatedPriceFeed = await PortfolioManager.priceFeeds(USDT18_ADDRESS);
    console.log("✅ Verified price feed address:", updatedPriceFeed);

    console.log("\n🎉 USDT18 price feed is now working!");
    console.log("🔗 Explorer:", `https://sepolia.mantlescan.xyz/tx/${tx.hash}`);
  } catch (error) {
    console.error("❌ Error updating price feed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
