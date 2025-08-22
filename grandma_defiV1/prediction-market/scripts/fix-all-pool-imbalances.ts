import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Fixing ALL AMM Pool Imbalances Based on Chainlink Prices");

  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  const portfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1"
  );

  console.log("\n1️⃣ CHECKING CURRENT CHAINLINK PRICES...");

  // Get current prices from Chainlink
  const mntPrice = await portfolioManager.getTokenPrice(
    "0x0000000000000000000000000000000000000000"
  );
  const wethPrice = await portfolioManager.getTokenPrice(
    "0x1e8a097E2942292264dFd840cE2328056Fec716c"
  );
  const usdtPrice = await portfolioManager.getTokenPrice(
    "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf"
  );

  const mntPriceUSD = Number(mntPrice) / 1e8;
  const wethPriceUSD = Number(wethPrice) / 1e8;
  const usdtPriceUSD = Number(usdtPrice) / 1e8;

  console.log(`   MNT Price: $${mntPriceUSD.toFixed(4)}`);
  console.log(`   wETH Price: $${wethPriceUSD.toFixed(2)}`);
  console.log(`   USDT Price: $${usdtPriceUSD.toFixed(4)}`);

  // Calculate correct ratios based on prices
  const wethToMntRatio = wethPriceUSD / mntPriceUSD; // How many MNT = 1 wETH
  const usdtToMntRatio = usdtPriceUSD / mntPriceUSD; // How many MNT = 1 USDT

  console.log(`\n📊 CALCULATED RATIOS:`);
  console.log(`   1 wETH should = ${wethToMntRatio.toFixed(2)} MNT`);
  console.log(`   1 USDT should = ${usdtToMntRatio.toFixed(4)} MNT`);

  console.log("\n2️⃣ ADDING LIQUIDITY TO BALANCE POOLS...");

  // Add large amounts of liquidity with correct ratios
  const baseAmount = ethers.parseEther("2000"); // 10,000 MNT base

  // wETH pool: Add wETH and MNT in correct ratio
  const wethAmount = baseAmount / BigInt(Math.floor(wethToMntRatio));
  const mntForWeth = wethAmount * BigInt(Math.floor(wethToMntRatio));

  console.log(`\n🔷 Balancing wETH Pool:`);
  console.log(`   Adding ${ethers.formatEther(wethAmount)} wETH`);
  console.log(`   Adding ${ethers.formatEther(mntForWeth)} MNT`);

  // Get wETH contract and mint tokens
  const wETH = await ethers.getContractAt(
    "MockWETH",
    "0x1e8a097E2942292264dFd840cE2328056Fec716c"
  );
  await wETH.mint(deployer.address, wethAmount * 2n); // Mint extra
  await wETH.approve(portfolioManager.target, wethAmount);

  // Add wETH liquidity
  const wethTx = await portfolioManager.addLiquidity(
    "0x1e8a097E2942292264dFd840cE2328056Fec716c",
    wethAmount,
    { value: mntForWeth }
  );
  console.log(`   ✅ wETH liquidity added: ${wethTx.hash}`);
  await wethTx.wait();

  // USDT pool: Add USDT and MNT in correct ratio
  const usdtAmount =
    (baseAmount / BigInt(Math.floor(usdtToMntRatio * 1000))) * 1000n; // Scale for precision
  const mntForUsdt =
    (usdtAmount * BigInt(Math.floor(usdtToMntRatio * 1000))) / 1000n;

  console.log(`\n💸 Balancing USDT Pool:`);
  console.log(`   Adding ${ethers.formatEther(usdtAmount)} USDT18`);
  console.log(`   Adding ${ethers.formatEther(mntForUsdt)} MNT`);

  // Get USDT contract and mint tokens
  const usdt = await ethers.getContractAt(
    "MockUSDT18",
    "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf"
  );
  await usdt.mint(deployer.address, usdtAmount * 2n); // Mint extra
  await usdt.approve(portfolioManager.target, usdtAmount);

  // Add USDT liquidity
  const usdtTx = await portfolioManager.addLiquidity(
    "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf",
    usdtAmount,
    { value: mntForUsdt }
  );
  console.log(`   ✅ USDT liquidity added: ${usdtTx.hash}`);
  await usdtTx.wait();

  console.log("\n3️⃣ VERIFYING POOL BALANCE...");

  // Check pool ratios after balancing
  const wethPool = await portfolioManager.liquidityPools(
    "0x1e8a097E2942292264dFd840cE2328056Fec716c"
  );
  const usdtPool = await portfolioManager.liquidityPools(
    "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf"
  );

  const wethPoolRatio = Number(wethPool[0]) / Number(wethPool[1]);
  const usdtPoolRatio = Number(usdtPool[0]) / Number(usdtPool[1]);

  console.log(
    `   wETH Pool Ratio: 1 wETH = ${(Number(wethPool[0]) / Number(wethPool[1])).toFixed(2)} MNT`
  );
  console.log(
    `   USDT Pool Ratio: 1 USDT = ${(Number(usdtPool[0]) / Number(usdtPool[1])).toFixed(4)} MNT`
  );
  console.log(`   Expected wETH: ${wethToMntRatio.toFixed(2)} MNT`);
  console.log(`   Expected USDT: ${usdtToMntRatio.toFixed(4)} MNT`);

  const wethAccuracy =
    (Math.abs(wethPoolRatio - wethToMntRatio) / wethToMntRatio) * 100;
  const usdtAccuracy =
    (Math.abs(usdtPoolRatio - usdtToMntRatio) / usdtToMntRatio) * 100;

  console.log(`\n📈 BALANCE ACCURACY:`);
  console.log(
    `   wETH Pool: ${wethAccuracy < 5 ? "✅" : "❌"} ${(100 - wethAccuracy).toFixed(1)}% accurate`
  );
  console.log(
    `   USDT Pool: ${usdtAccuracy < 5 ? "✅" : "❌"} ${(100 - usdtAccuracy).toFixed(1)}% accurate`
  );

  if (wethAccuracy < 5 && usdtAccuracy < 5) {
    console.log("\n🎉 ALL POOLS SUCCESSFULLY BALANCED!");
    console.log("💡 New portfolios should now have accurate USD values");
  } else {
    console.log("\n⚠️  Some pools still need adjustment");
    console.log(
      "💡 Consider running the script again or adding more liquidity"
    );
  }

  console.log("\n4️⃣ RECOMMENDED NEXT STEPS:");
  console.log(
    "   • Test with: npx hardhat run scripts/test-balanced-portfolio.ts"
  );
  console.log("   • Create a new portfolio and verify USD accuracy");
  console.log("   • Monitor pool ratios over time");
}

main().catch(console.error);
