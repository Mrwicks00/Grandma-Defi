import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Setting price feed for USDT18 token...");

  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";
  const USDT18_ADDRESS = "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf";
  const USDT_PRICE_FEED = "0x71c184d899c1774d597d8D80526FB02dF708A69a"; // Chainlink USDT price feed

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );

  // Check current price feed setup
  console.log("\n📋 Current USDT18 price feed setup:");
  try {
    const currentPriceFeed = await PortfolioManager.priceFeeds(USDT18_ADDRESS);
    console.log("Current price feed:", currentPriceFeed);

    if (currentPriceFeed === "0x0000000000000000000000000000000000000000") {
      console.log("❌ No price feed set (zero address)");
    } else {
      console.log("✅ Price feed is set, updating to correct one...");
    }
  } catch (error) {
    console.log("❌ Error checking current setup:", error);
  }

  // Set the correct price feed
  console.log("\n🔧 Setting USDT18 price feed...");
  console.log("USDT18 token address:", USDT18_ADDRESS);
  console.log("Chainlink USDT price feed:", USDT_PRICE_FEED);

  try {
    const tx = await PortfolioManager.setPriceFeed(
      USDT18_ADDRESS,
      USDT_PRICE_FEED
    );
    console.log("Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    await tx.wait();
    console.log("✅ Price feed set successfully!");

    // Verify the new price feed
    console.log("\n🔍 Verifying new price feed...");
    const updatedPriceFeed = await PortfolioManager.priceFeeds(USDT18_ADDRESS);
    console.log("Updated price feed address:", updatedPriceFeed);

    // Test getting the price
    console.log("\n🧪 Testing price retrieval...");
    try {
      const price = await PortfolioManager.getTokenPrice(USDT18_ADDRESS);
      console.log("✅ USDT18 price:", price.toString());
      console.log("💵 Price in USD:", (Number(price) / 1e8).toFixed(8));
    } catch (priceError) {
      console.log("❌ Error getting price:", priceError);
    }

    console.log("\n🎉 USDT18 price feed configuration completed!");
    console.log("🔗 Explorer:", `https://sepolia.mantlescan.xyz/tx/${tx.hash}`);
    console.log("\n💡 Now you can create portfolios with USDT18!");
  } catch (error) {
    console.error("❌ Error setting price feed:", error);

    if (error instanceof Error) {
      if (error.message.includes("Ownable")) {
        console.log("💡 Make sure you're using the contract owner's wallet!");
      } else if (error.message.includes("invalid address")) {
        console.log("💡 Check that the price feed address is correct");
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });










