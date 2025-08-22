import { ethers } from "hardhat";

async function main() {
  console.log("💧 Adding liquidity to USDT18 pool...");

  // Contract addresses
  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";
  const USDT18_ADDRESS = "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf";

  // Liquidity amounts - let's add a reasonable amount
  const MNT_AMOUNT = ethers.parseEther("100"); // 100 MNT
  const USDT18_AMOUNT = ethers.parseEther("100"); // 100 USDT18 (18 decimals now)

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer MNT balance:", ethers.formatEther(balance));

  if (balance < MNT_AMOUNT) {
    console.log("❌ Insufficient MNT balance!");
    return;
  }

  // Get contracts
  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );
  const USDT18 = await ethers.getContractAt("MockUSDT18", USDT18_ADDRESS);

  // Check USDT18 balance and mint if needed
  console.log("\n📋 Checking USDT18 balance...");
  const usdt18Balance = await USDT18.balanceOf(deployer.address);
  console.log("Current USDT18 balance:", ethers.formatEther(usdt18Balance));

  if (usdt18Balance < USDT18_AMOUNT) {
    console.log("💰 Minting USDT18 tokens...");
    const mintTx = await USDT18.mint(deployer.address, USDT18_AMOUNT);
    await mintTx.wait();
    console.log("✅ USDT18 tokens minted");
  }

  // Approve USDT18 spending
  console.log("\n🔓 Approving USDT18 spending...");
  const approveTx = await USDT18.approve(
    PORTFOLIO_MANAGER_ADDRESS,
    USDT18_AMOUNT
  );
  await approveTx.wait();
  console.log("✅ USDT18 spending approved");

  // Check current pool state
  console.log("\n🔍 Checking current pool state...");
  try {
    const reserves = await PortfolioManager.getPoolReserves(
      "0x0000000000000000000000000000000000000000", // MNT
      USDT18_ADDRESS
    );
    console.log(
      "Current MNT/USDT18 reserves:",
      ethers.formatEther(reserves[0]),
      "/",
      ethers.formatEther(reserves[1])
    );
  } catch (error) {
    console.log("Pool reserves not available yet (will be created)");
  }

  // Add liquidity
  console.log("\n💧 Adding liquidity to MNT/USDT18 pool...");
  console.log(
    `Adding ${ethers.formatEther(MNT_AMOUNT)} MNT and ${ethers.formatEther(USDT18_AMOUNT)} USDT18`
  );

  try {
    const tx = await PortfolioManager.addLiquidity(
      USDT18_ADDRESS, // Token address
      USDT18_AMOUNT, // Token amount
      { value: MNT_AMOUNT } // MNT amount (sent as value)
    );

    console.log("Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Liquidity added successfully!");
    console.log("Gas used:", receipt?.gasUsed?.toString());

    // Check new pool state
    console.log("\n📊 New pool state:");
    const newReserves = await PortfolioManager.getPoolReserves(
      "0x0000000000000000000000000000000000000000", // MNT
      USDT18_ADDRESS
    );
    console.log(
      "New MNT/USDT18 reserves:",
      ethers.formatEther(newReserves[0]),
      "/",
      ethers.formatEther(newReserves[1])
    );

    // Calculate the ratio
    const ratio =
      Number(ethers.formatEther(newReserves[0])) /
      Number(ethers.formatEther(newReserves[1]));
    console.log("Pool ratio (MNT per USDT18):", ratio.toFixed(6));

    console.log(
      "\n🎉 USDT18 liquidity pool is now ready for portfolio creation!"
    );
    console.log("🔗 Explorer:", `https://sepolia.mantlescan.xyz/tx/${tx.hash}`);
  } catch (error) {
    console.error("❌ Error adding liquidity:", error);

    if (error instanceof Error) {
      if (error.message.includes("insufficient allowance")) {
        console.log("💡 Try increasing the approval amount");
      } else if (error.message.includes("insufficient balance")) {
        console.log("💡 Check token balances");
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
