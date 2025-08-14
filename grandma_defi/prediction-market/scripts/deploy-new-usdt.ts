import { ethers } from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
    console.log("🚀 Deploying New USDT with 18 Decimals (USDT18)\n");

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deployer:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", formatEther(balance), "MNT\n");

    try {
        // Deploy new USDT with 18 decimals
        console.log("1️⃣ DEPLOYING NEW USDT18 CONTRACT:");
        
        const USDT18Factory = await ethers.getContractFactory("MockUSDT18");
        
        // Deploy the new 18-decimal USDT
        const usdt18 = await USDT18Factory.deploy();
        await usdt18.waitForDeployment();
        
        const usdt18Address = await usdt18.getAddress();
        console.log("✅ USDT18 deployed to:", usdt18Address);
        
        // Check the new token details
        const symbol = await usdt18.symbol();
        const name = await usdt18.name();
        const decimals = await usdt18.decimals();
        const totalSupply = await usdt18.totalSupply();
        
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Name: ${name}`);
        console.log(`   Decimals: ${decimals}`);
        console.log(`   Total Supply: ${formatEther(totalSupply)} ${symbol}\n`);

        // Mint some tokens for testing
        console.log("2️⃣ MINTING INITIAL USDT18 SUPPLY:");
        const mintAmount = parseEther("1000000"); // 1M USDT18
        await usdt18.mint(deployer.address, mintAmount);
        console.log(`✅ Minted ${formatEther(mintAmount)} USDT18 to deployer\n`);

        // Get Portfolio Manager instance
        console.log("3️⃣ ADDING LIQUIDITY TO NEW USDT18 POOL:");
        const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
        const portfolioManager = PortfolioManager.attach("0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1");

        // Add liquidity with 1:1 ratio (both 18 decimals now!)
        const liquidityMNT = parseEther("1000"); // 1000 MNT
        const liquidityUSDT18 = parseEther("1000"); // 1000 USDT18
        
        // Approve the portfolio manager
        await usdt18.approve("0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1", liquidityUSDT18);
        console.log("✅ USDT18 spending approved");
        
        // Add liquidity
        await portfolioManager.addLiquidity(usdt18Address, liquidityUSDT18, { value: liquidityMNT });
        console.log("✅ Liquidity added to USDT18 pool\n");

        // Verify the new pool
        console.log("4️⃣ VERIFYING NEW USDT18 POOL:");
        const newPool = await portfolioManager.liquidityPools(usdt18Address);
        console.log(`   MNT Reserve: ${formatEther(newPool.mntReserve)} MNT`);
        console.log(`   USDT18 Reserve: ${formatEther(newPool.tokenReserve)} USDT18`);
        
        const ratio = Number(formatEther(newPool.mntReserve)) / Number(formatEther(newPool.tokenReserve));
        console.log(`   Ratio: 1 USDT18 = ${ratio.toFixed(2)} MNT ✅\n`);

        // Test swap simulation
        console.log("5️⃣ TESTING SWAP SIMULATION:");
        const testMNT = 10;
        const mntReserve = Number(formatEther(newPool.mntReserve));
        const usdt18Reserve = Number(formatEther(newPool.tokenReserve));
        
        const newMntReserve = mntReserve + testMNT;
        const newUsdt18Reserve = (mntReserve * usdt18Reserve) / newMntReserve;
        const usdt18Output = usdt18Reserve - newUsdt18Reserve;
        
        console.log(`   Simulating: ${testMNT} MNT → ${usdt18Output.toFixed(6)} USDT18`);
        console.log(`   Expected: ~9-10 USDT18`);
        console.log(`   Result: ${usdt18Output > 8 && usdt18Output < 12 ? "✅ PERFECT!" : "❌ STILL BROKEN"}\n`);

        console.log("🎉 NEW USDT18 DEPLOYMENT COMPLETE!");
        console.log("\n📋 NEXT STEPS:");
        console.log("   1. Update your config/addresses.ts with new USDT address:");
        console.log(`      USDT: "${usdt18Address}"`);
        console.log("   2. Update SUPPORTED_TOKENS decimals from 6 to 18");
        console.log("   3. Test portfolio creation with new USDT18");
        console.log("\n🔄 CONFIG UPDATE NEEDED:");
        console.log(`   Old USDT: 0x6db5d0288ADcf2413afA84e06C158a5bDd85460F (6 decimals)`);
        console.log(`   New USDT18: ${usdt18Address} (18 decimals)`);

    } catch (error) {
        console.log("❌ Deployment failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
