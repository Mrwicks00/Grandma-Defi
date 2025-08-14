import { ethers } from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log("🔧 Fixing USDT Liquidity Pool with Proper Decimal Handling\n");

  // Get contract instances
  const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
  const portfolioManager = PortfolioManager.attach(
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1"
  );

  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const tokenFactory = TokenFactory.attach(
    "0x118B873495387990eA7E2FF5b8479381f778a5Be"
  );

  const [deployer] = await ethers.getSigners();
  console.log("🔑 Account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", formatEther(balance), "MNT\n");

  try {
    // 1. Check current USDT pool state
    console.log("1️⃣ CURRENT USDT POOL STATE:");
    const currentPool = await portfolioManager.liquidityPools(
      "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F"
    );
    console.log(
      `   Current MNT Reserve: ${formatEther(currentPool.mntReserve)} MNT`
    );
    console.log(
      `   Current USDT Reserve: ${(Number(currentPool.tokenReserve) / 1e6).toFixed(6)} USDT`
    );

    const currentRatio =
      Number(currentPool.mntReserve) / (Number(currentPool.tokenReserve) / 1e6);
    console.log(
      `   Current Ratio: 1 USDT = ${currentRatio.toFixed(0)} MNT (BROKEN!)\n`
    );

    // 2. Calculate proper amounts for 1:1 ratio
    console.log("2️⃣ CALCULATING PROPER LIQUIDITY AMOUNTS:");

    // Target: 1 USDT = 1 MNT (realistic for stablecoin)
    const targetMNTAmount = parseEther("1000.0"); // 1000 MNT
    const targetUSDTAmount = BigInt(1000 * 1e6); // 1000 USDT (6 decimals)

    console.log(`   Target MNT: ${formatEther(targetMNTAmount)} MNT`);
    console.log(`   Target USDT: ${Number(targetUSDTAmount) / 1e6} USDT`);
    console.log(`   Target Ratio: 1 USDT = 1.00 MNT ✅\n`);

    // 3. Mint fresh USDT tokens
    console.log("3️⃣ MINTING FRESH USDT TOKENS:");
    try {
      await tokenFactory.mintTokens(
        deployer.address,
        parseEther("0"), // wETH
        parseEther("0"), // wBTC
        targetUSDTAmount, // USDT
        parseEther("0") // GRANDMA
      );
      console.log("✅ USDT tokens minted successfully\n");
    } catch (error) {
      console.log("⚠️ Token minting may have failed (might already exist)\n");
    }

    // 4. Approve USDT spending first
    console.log("4️⃣ APPROVING USDT SPENDING:");
    const ERC20_ABI = [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)",
    ];

    const usdtContract = new ethers.Contract(
      "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F",
      ERC20_ABI,
      deployer
    );

    // Check USDT balance
    const usdtBalance = await usdtContract.balanceOf(deployer.address);
    console.log(
      `   USDT Balance: ${(Number(usdtBalance) / 1e6).toFixed(6)} USDT`
    );

    // Approve the portfolio manager to spend USDT
    const approveTx = await usdtContract.approve(
      "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1",
      targetUSDTAmount
    );
    await approveTx.wait();
    console.log("✅ USDT spending approved\n");

    // 5. Add new liquidity with proper ratio
    console.log("5️⃣ ADDING PROPER USDT/MNT LIQUIDITY:");
    console.log(
      `   Adding: ${formatEther(targetMNTAmount)} MNT + ${Number(targetUSDTAmount) / 1e6} USDT`
    );

    const addLiquidityTx = await portfolioManager.addLiquidity(
      "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F", // USDT address
      targetUSDTAmount,
      {
        value: targetMNTAmount,
        // Let the network estimate gas automatically
      }
    );

    await addLiquidityTx.wait();
    console.log("✅ New liquidity added successfully!\n");

    // 6. Verify the fix
    console.log("6️⃣ VERIFYING THE FIX:");
    const newPool = await portfolioManager.liquidityPools(
      "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F"
    );
    console.log(`   New MNT Reserve: ${formatEther(newPool.mntReserve)} MNT`);
    console.log(
      `   New USDT Reserve: ${(Number(newPool.tokenReserve) / 1e6).toFixed(6)} USDT`
    );

    const newRatio =
      Number(newPool.mntReserve) / (Number(newPool.tokenReserve) / 1e6);
    console.log(`   New Ratio: 1 USDT = ${newRatio.toFixed(2)} MNT`);

    if (newRatio > 0.5 && newRatio < 2.0) {
      console.log("   ✅ Ratio looks good! USDT swaps should work now.\n");
    } else {
      console.log("   ⚠️ Ratio still looks off. May need more adjustment.\n");
    }

    // 7. Test swap simulation
    console.log("7️⃣ TESTING SWAP SIMULATION:");
    const testSwapMNT = 10; // Test with 10 MNT
    const mntReserve = Number(newPool.mntReserve);
    const usdtReserve = Number(newPool.tokenReserve) / 1e6;

    // AMM formula: x * y = k
    const newMntReserve = mntReserve + testSwapMNT;
    const newUsdtReserve = (mntReserve * usdtReserve) / newMntReserve;
    const usdtOutput = usdtReserve - newUsdtReserve;

    console.log(
      `   Simulating: ${testSwapMNT} MNT → ${usdtOutput.toFixed(6)} USDT`
    );
    console.log(`   Expected range: 8-12 USDT`);
    console.log(
      `   Result: ${usdtOutput > 5 && usdtOutput < 15 ? "✅ GOOD" : "❌ STILL BROKEN"}\n`
    );

    console.log("🎉 USDT LIQUIDITY FIX COMPLETE!");
    console.log("\n💡 Next steps:");
    console.log("   1. Try creating a new portfolio to test USDT allocation");
    console.log(
      "   2. Check if existing portfolios can now rebalance into USDT"
    );
    console.log("   3. Monitor USDT swap success rates");
  } catch (error) {
    console.log("❌ Fix failed:", error.message);
    console.log("\n🔍 Possible issues:");
    console.log("   • Insufficient MNT balance for liquidity");
    console.log("   • USDT token approval needed");
    console.log("   • Contract permission restrictions");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
