import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Debugging Price Feeds...\n");

    const ADDRESSES = {
        PortfolioManager: "0x9F520DE61141f340e1864c9c9b995d8d37ae477B",
        wETH: "0x67c04C2985D47ce3fe126326e96598d43edd25c9",
        USDT: "0xA1dE30425f8635a202A97A129dB2af44632ABaA7"
    };

    const PRICE_FEEDS = {
        MNT_USD: "0xD97F20bEbeD74e8144134C4b148fE93417dd0F96", 
        ETH_USD: "0x5bc7Cf88EB131DB18b5d7930e793095140799aD5", 
        USDT_USD: "0xd86048D5e4fe96157CE03Ae519A9045bEDaa6551"
    };

    const [deployer] = await ethers.getSigners();
    const portfolioManager = await ethers.getContractAt("PortfolioManager", ADDRESSES.PortfolioManager);

    // Test each price feed directly
    console.log("📊 Testing price feeds directly...\n");

    // Test MNT price feed directly
    try {
        console.log("1. Testing MNT price feed:");
        const mntFeedAddress = PRICE_FEEDS.MNT_USD;
        const mntFeed = await ethers.getContractAt("AggregatorV3Interface", mntFeedAddress);
        
        console.log("   Feed address:", mntFeedAddress);
        const mntResult = await mntFeed.latestRoundData();
        console.log("   ✅ MNT Direct Price:", mntResult[1].toString());
        console.log("   Decimals:", await mntFeed.decimals());
        
    } catch (error: any) {
        console.log("   ❌ MNT Direct Feed Failed:", error.message);
    }

    // Test wETH price feed directly
    try {
        console.log("\n2. Testing wETH price feed:");
        const wethFeedAddress = PRICE_FEEDS.ETH_USD;
        const wethFeed = await ethers.getContractAt("AggregatorV3Interface", wethFeedAddress);
        
        console.log("   Feed address:", wethFeedAddress);
        const wethResult = await wethFeed.latestRoundData();
        console.log("   ✅ wETH Direct Price:", wethResult[1].toString());
        console.log("   Decimals:", await wethFeed.decimals());
        
    } catch (error: any) {
        console.log("   ❌ wETH Direct Feed Failed:", error.message);
    }

    // Test USDT price feed directly
    try {
        console.log("\n3. Testing USDT price feed:");
        const usdtFeedAddress = PRICE_FEEDS.USDT_USD;
        const usdtFeed = await ethers.getContractAt("AggregatorV3Interface", usdtFeedAddress);
        
        console.log("   Feed address:", usdtFeedAddress);
        const usdtResult = await usdtFeed.latestRoundData();
        console.log("   ✅ USDT Direct Price:", usdtResult[1].toString());
        console.log("   Decimals:", await usdtFeed.decimals());
        
    } catch (error: any) {
        console.log("   ❌ USDT Direct Feed Failed:", error.message);
    }

    console.log("\n📈 Testing through PortfolioManager...\n");

    // Test MNT through contract
    try {
        console.log("4. Testing MNT through contract:");
        const mntPrice = await portfolioManager.getTokenPrice(ethers.ZeroAddress);
        console.log("   ✅ MNT Contract Price:", mntPrice.toString());
    } catch (error: any) {
        console.log("   ❌ MNT Contract Failed:", error.message);
        
        // Let's check what's actually stored
        const storedFeed = await portfolioManager.priceFeeds(ethers.ZeroAddress);
        console.log("   Stored feed for MNT:", storedFeed);
        
        if (storedFeed === ethers.ZeroAddress) {
            console.log("   🔥 ISSUE: MNT price feed not set in contract!");
        }
    }

    // Test wETH through contract
    try {
        console.log("\n5. Testing wETH through contract:");
        const wethPrice = await portfolioManager.getTokenPrice(ADDRESSES.wETH);
        console.log("   ✅ wETH Contract Price:", wethPrice.toString());
    } catch (error: any) {
        console.log("   ❌ wETH Contract Failed:", error.message);
    }

    // Test USDT through contract
    try {
        console.log("\n6. Testing USDT through contract:");
        const usdtPrice = await portfolioManager.getTokenPrice(ADDRESSES.USDT);
        console.log("   ✅ USDT Contract Price:", usdtPrice.toString());
    } catch (error: any) {
        console.log("   ❌ USDT Contract Failed:", error.message);
    }

    // Check all stored price feeds
    console.log("\n🔍 Checking stored price feeds in contract:");
    const mntStoredFeed = await portfolioManager.priceFeeds(ethers.ZeroAddress);
    const wethStoredFeed = await portfolioManager.priceFeeds(ADDRESSES.wETH);
    const usdtStoredFeed = await portfolioManager.priceFeeds(ADDRESSES.USDT);
    
    console.log("   MNT stored feed:", mntStoredFeed);
    console.log("   wETH stored feed:", wethStoredFeed);
    console.log("   USDT stored feed:", usdtStoredFeed);

    // If MNT feed is not set, set it now
    if (mntStoredFeed === ethers.ZeroAddress) {
        console.log("\n🔧 Setting MNT price feed...");
        try {
            const setMntTx = await portfolioManager.setPriceFeed(ethers.ZeroAddress, PRICE_FEEDS.MNT_USD);
            await setMntTx.wait();
            console.log("✅ MNT price feed set!");
            
            // Test again
            const mntPrice = await portfolioManager.getTokenPrice(ethers.ZeroAddress);
            console.log("✅ MNT Contract Price after setting:", mntPrice.toString());
        } catch (error: any) {
            console.log("❌ Failed to set MNT price feed:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Debug failed:", error);
        process.exit(1);
    });