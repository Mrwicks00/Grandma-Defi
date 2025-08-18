import { ethers } from "hardhat";

async function main() {
  console.log("🎯 Creating a new portfolio...");

  // Contract addresses
  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";

  // Token addresses (now including the new USDT18)
  const TOKENS = {
    MNT: "0x0000000000000000000000000000000000000000", // Native token
    wETH: "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece",
    USDT18: "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf", // New USDT18 with 18 decimals
  };

  // Portfolio configuration
  const portfolioTokens = [TOKENS.MNT, TOKENS.wETH, TOKENS.USDT18];

  // Allocations in basis points (10000 = 100%)
  // 40% MNT, 40% wETH, 20% USDT18
  const allocations = [4000, 4000, 2000];

  // Rebalance threshold (5% = 500 basis points)
  const rebalanceThreshold = 500;

  // Initial value in MNT (20 MNT)
  const initialValueMNT = ethers.parseEther("20");

  // Get the signer (deployer)
  const [deployer] = await ethers.getSigners();
  console.log("Creating portfolio with address:", deployer.address);

  // Check balance first
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Current balance:", ethers.formatEther(balance), "MNT");

  if (balance < initialValueMNT) {
    console.log("❌ Insufficient balance! Need at least 20 MNT");
    return;
  }

  // Get PortfolioManager contract
  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );

  // Verify tokens are supported
  console.log("\n📋 Verifying token support...");
  for (let i = 0; i < portfolioTokens.length; i++) {
    const token = portfolioTokens[i];
    const tokenName = Object.keys(TOKENS)[i];

    if (token === TOKENS.MNT) {
      console.log(`✅ ${tokenName}: Native token (always supported)`);
    } else {
      try {
        const isSupported = await PortfolioManager.isTokenSupported(token);
        console.log(
          `${isSupported ? "✅" : "❌"} ${tokenName} (${token}): ${isSupported ? "Supported" : "Not supported"}`
        );

        if (!isSupported) {
          console.log(
            `❌ Token ${tokenName} is not supported. Please add it first.`
          );
          return;
        }
      } catch (error) {
        console.log(`⚠️  Could not verify ${tokenName} support`);
      }
    }
  }

  console.log("\n🚀 Creating portfolio...");
  console.log("Tokens:", portfolioTokens);
  console.log("Allocations:", allocations, "(40%, 40%, 20%)");
  console.log("Rebalance threshold:", rebalanceThreshold, "basis points (5%)");
  console.log("Initial value:", ethers.formatEther(initialValueMNT), "MNT");

  try {
    // Create the portfolio
    const tx = await PortfolioManager.createPortfolio(
      portfolioTokens,
      allocations,
      rebalanceThreshold,
      { value: initialValueMNT }
    );

    console.log("Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Portfolio created successfully!");
    console.log("Gas used:", receipt?.gasUsed?.toString());

    // Get the user's portfolios to find the new portfolio ID
    console.log("\n🔍 Finding new portfolio ID...");
    const userPortfolios = await PortfolioManager.getUserPortfolios(
      deployer.address
    );
    console.log(
      "Your portfolio IDs:",
      userPortfolios.map((id: any) => id.toString())
    );

    if (userPortfolios.length > 0) {
      const latestPortfolioId = userPortfolios[userPortfolios.length - 1];
      console.log(`🎯 Latest portfolio ID: ${latestPortfolioId}`);

      // Get portfolio details
      console.log("\n📊 Portfolio details:");
      const portfolioData =
        await PortfolioManager.getPortfolio(latestPortfolioId);
      const [
        owner,
        tokens,
        targetAllocations,
        currentBalances,
        totalValueUSD,
        active,
      ] = portfolioData;

      console.log("Owner:", owner);
      console.log("Active:", active);
      console.log(
        "Total Value USD:",
        (Number(totalValueUSD) / 1e8).toFixed(2),
        "USD"
      );

      console.log("\nToken allocations:");
      for (let i = 0; i < tokens.length; i++) {
        const tokenAddr = tokens[i];
        const allocation = Number(targetAllocations[i]) / 100; // Convert from basis points to percentage
        const balance = ethers.formatEther(currentBalances[i]);

        let tokenName = "Unknown";
        if (tokenAddr === TOKENS.MNT) tokenName = "MNT";
        else if (tokenAddr === TOKENS.wETH) tokenName = "wETH";
        else if (tokenAddr === TOKENS.USDT18) tokenName = "USDT18";

        console.log(`• ${tokenName}: ${allocation}% (Balance: ${balance})`);
      }
    }

    console.log("\n🎉 Portfolio creation completed!");
    console.log("🔗 Explorer:", `https://sepolia.mantlescan.xyz/tx/${tx.hash}`);
  } catch (error) {
    console.error("❌ Error creating portfolio:", error);

    if (error instanceof Error) {
      if (error.message.includes("Token not supported")) {
        console.log(
          "💡 One of the tokens is not supported. Check that USDT18 was added correctly."
        );
      } else if (error.message.includes("insufficient funds")) {
        console.log(
          "💡 Insufficient funds. Make sure you have enough MNT for the initial value + gas."
        );
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










