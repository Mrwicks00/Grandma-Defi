import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Adding USDT18 to PortfolioManager supported tokens...");

  // Get contract addresses
  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";
  const NEW_USDT18_ADDRESS = "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf"; // From your config
  const USDT_PRICE_FEED = "0xd86048D5e4fe96157CE03Ae519A9045bEDaa6551"; // From deployment.json

  // Get the signer (deployer)
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Get PortfolioManager contract
  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );

  // Check if token is already supported
  console.log("\n📋 Checking current token support...");
  try {
    const isSupported =
      await PortfolioManager.isTokenSupported(NEW_USDT18_ADDRESS);
    console.log(`USDT18 (${NEW_USDT18_ADDRESS}) supported:`, isSupported);

    if (isSupported) {
      console.log("✅ USDT18 is already supported!");
      return;
    }
  } catch (error) {
    console.log("Unable to check token support, proceeding...");
  }

  // Add the new USDT18 token
  console.log("\n🚀 Adding USDT18 as supported token...");
  console.log("Token Address:", NEW_USDT18_ADDRESS);
  console.log("Price Feed:", USDT_PRICE_FEED);

  try {
    const tx = await PortfolioManager.addSupportedToken(
      NEW_USDT18_ADDRESS,
      USDT_PRICE_FEED
    );
    console.log("Transaction hash:", tx.hash);

    console.log("⏳ Waiting for confirmation...");
    await tx.wait();

    console.log("✅ USDT18 added successfully!");

    // Verify the addition
    console.log("\n🔍 Verifying...");
    const isNowSupported =
      await PortfolioManager.isTokenSupported(NEW_USDT18_ADDRESS);
    console.log("USDT18 now supported:", isNowSupported);

    // Get the price feed to confirm
    const priceFeed = await PortfolioManager.priceFeeds(NEW_USDT18_ADDRESS);
    console.log("Price feed address:", priceFeed);

    console.log("\n🎉 USDT18 is now ready for portfolio creation!");
  } catch (error) {
    console.error("❌ Error adding USDT18 support:", error);

    if (error instanceof Error && error.message.includes("Ownable")) {
      console.log("💡 Make sure you're using the contract owner's wallet!");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });








