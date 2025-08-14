import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    console.log("🚀 Deploying DeFi Portfolio Manager on Mantle Testnet...\n");

    // Mainnet Chainlink Price Feed Addresses
    const PRICE_FEEDS = {
        MNT_USD: "0xD97F20bEbeD74e8144134C4b148fE93417dd0F96", 
        ETH_USD: "0x5bc7Cf88EB131DB18b5d7930e793095140799aD5", 
        BTC_USD: "0x7db2275279F52D0914A481e14c4Ce5a59705A25b",
        USDT_USD: "0xd86048D5e4fe96157CE03Ae519A9045bEDaa6551"
    };

    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MNT\n");

    // Step 1: Deploy Token Factory and Mock Tokens
    console.log("📦 Deploying Token Factory...");
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const tokenFactory = await TokenFactory.deploy();
    await tokenFactory.waitForDeployment();
    
    const tokenFactoryAddress = await tokenFactory.getAddress();
    console.log("✅ TokenFactory deployed to:", tokenFactoryAddress);

    // Get token addresses
    const tokenAddresses = await tokenFactory.getTokenAddresses();
    console.log("🪙 Token Addresses:");
    console.log("   wETH:", tokenAddresses.wETHAddress);
    console.log("   wBTC:", tokenAddresses.wBTCAddress);
    console.log("   USDT:", tokenAddresses.usdtAddress);
    console.log("   GRANDMA:", tokenAddresses.grandmaAddress);
    console.log("");

    // Step 2: Deploy Portfolio Manager
    console.log("📊 Deploying Portfolio Manager...");
    
    const supportedTokens = [
        tokenAddresses.wETHAddress,
        tokenAddresses.wBTCAddress,
        tokenAddresses.usdtAddress,
        tokenAddresses.grandmaAddress
    ];
    
    const priceFeeds = [
        PRICE_FEEDS.ETH_USD,
        PRICE_FEEDS.BTC_USD,
        PRICE_FEEDS.USDT_USD,
        PRICE_FEEDS.USDT_USD // Use USDT feed for GRANDMA temporarily
    ];

    const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
    const portfolioManager = await PortfolioManager.deploy(supportedTokens, priceFeeds);
    await portfolioManager.waitForDeployment();
    
    const portfolioManagerAddress = await portfolioManager.getAddress();
    console.log("✅ PortfolioManager deployed to:", portfolioManagerAddress);

    // Step 3: Set up all price feeds
    console.log("🔗 Setting up price feeds...");
    
    // Set MNT price feed
    await portfolioManager.setPriceFeed(ethers.ZeroAddress, PRICE_FEEDS.MNT_USD);
    console.log("✅ MNT price feed configured");
    
    // Set GRANDMA price feed to use USDT for now (or deploy a mock price feed)
    await portfolioManager.setPriceFeed(tokenAddresses.grandmaAddress, PRICE_FEEDS.USDT_USD);
    console.log("✅ GRANDMA price feed configured (using USDT reference)");

    await portfolioManager.setPriceFeed(tokenAddresses.wETHAddress, PRICE_FEEDS.ETH_USD);
    console.log("✅ wETH price feed configured");

    await portfolioManager.setPriceFeed(tokenAddresses.wBTCAddress, PRICE_FEEDS.BTC_USD);
    console.log("✅ wBTC price feed configured");

    await portfolioManager.setPriceFeed(tokenAddresses.usdtAddress, PRICE_FEEDS.USDT_USD);
    console.log("✅ USDT price feed configured");
    // await portfolioManager.setPriceFeed(tokenAddresses.grandmaAddress, PRICE_FEEDS.USDT_USD);

    // Step 4: Transfer token ownership to Portfolio Manager
    console.log("🔄 Transferring token ownership...");
    await tokenFactory.transferTokenOwnership(deployer.address);
    console.log("✅ Token ownership transferred to deployer");

    

   
    
    const wETH = await ethers.getContractAt("MockWETH", tokenAddresses.wETHAddress);
    const wBTC = await ethers.getContractAt("MockWBTC", tokenAddresses.wBTCAddress);
    const usdt = await ethers.getContractAt("MockUSDT", tokenAddresses.usdtAddress);
    const grandma = await ethers.getContractAt("GrandmaToken", tokenAddresses.grandmaAddress);


    console.log("🪙 Minting tokens...");
    await wETH.mint(deployer.address, ethers.parseEther("100000"));
    await wBTC.mint(deployer.address, ethers.parseUnits("10000", 8));
    await usdt.mint(deployer.address, ethers.parseUnits("5000000", 6));
    await grandma.mint(deployer.address, ethers.parseEther("10000000"));
    console.log("✅ Tokens minted\n");

    // Approve tokens for liquidity provision
    const liquidityAmounts = {
        wETH: ethers.parseEther("100"), // 100 wETH
        wBTC: ethers.parseUnits("2", 8), // 2 wBTC (8 decimals)
        usdt: ethers.parseUnits("100000", 6), // 200k USDT (6 decimals)
        grandma: ethers.parseEther("10000") // 50k GRANDMA
    };

    const mntLiquidity = ethers.parseEther("100"); // 100 MNT per pool

    try {
        // Add liquidity for each token pair
         // Step 5: Add initial liquidity to pools
    console.log("💧 Adding initial liquidity...");
        console.log("   Adding wETH/MNT liquidity...");
        await wETH.approve(portfolioManagerAddress, liquidityAmounts.wETH);
        await portfolioManager.addLiquidity(tokenAddresses.wETHAddress, liquidityAmounts.wETH, {
            value: mntLiquidity
        });

        console.log("   Adding wBTC/MNT liquidity...");
        await wBTC.approve(portfolioManagerAddress, liquidityAmounts.wBTC);
        await portfolioManager.addLiquidity(tokenAddresses.wBTCAddress, liquidityAmounts.wBTC, {
            value: mntLiquidity
        });

        console.log("   Adding USDT/MNT liquidity...");
        await usdt.approve(portfolioManagerAddress, liquidityAmounts.usdt);
        await portfolioManager.addLiquidity(tokenAddresses.usdtAddress, liquidityAmounts.usdt, {
            value: mntLiquidity
        });

        console.log("   Adding GRANDMA/MNT liquidity...");
        await grandma.approve(portfolioManagerAddress, liquidityAmounts.grandma);
        await portfolioManager.addLiquidity(tokenAddresses.grandmaAddress, liquidityAmounts.grandma, {
            value: mntLiquidity
        });

        console.log("✅ Initial liquidity added to all pools");
    } catch (error: any) {
        console.log("⚠️  Liquidity addition failed:", error.message);
    }

    // Step 6: Create a test portfolio
    console.log("🧪 Creating test portfolio...");
    
    try {
        const testTokens = [
            ethers.ZeroAddress, // MNT
            tokenAddresses.wETHAddress,
            tokenAddresses.usdtAddress
        ];
        
        const testAllocations = [
            5000, // 50% MNT
            3000, // 30% wETH  
            2000  // 20% USDT
        ];
        
        const rebalanceThreshold = 1000; // 10%
        
        const tx = await portfolioManager.createPortfolio(
            testTokens,
            testAllocations,
            rebalanceThreshold,
            { value: ethers.parseEther("10") } // 10 MNT initial deposit
        );
        
        await tx.wait();
        console.log("✅ Test portfolio created successfully");
        console.log("   Portfolio ID: 1");
        console.log("   Initial value: 10 MNT");
        console.log("   Allocation: 50% MNT, 30% wETH, 20% USDT");
    } catch (error: any) {
        console.log("⚠️  Test portfolio creation failed:", error.message);
    }

    // Step 7: Output deployment summary
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("=====================================");
    console.log("📋 Contract Addresses:");
    console.log(`   TokenFactory: ${tokenFactoryAddress}`);
    console.log(`   PortfolioManager: ${portfolioManagerAddress}`);
    console.log(`   wETH: ${tokenAddresses.wETHAddress}`);
    console.log(`   wBTC: ${tokenAddresses.wBTCAddress}`);
    console.log(`   USDT: ${tokenAddresses.usdtAddress}`);
    console.log(`   GRANDMA: ${tokenAddresses.grandmaAddress}`);
    console.log("");
    console.log("🔧 Next Steps:");
    console.log("1. Update your .env with these contract addresses");
    console.log("2. Configure ElizaOS portfolio plugin");
    console.log("3. Test AI agent interactions");
    console.log("");
    console.log("💡 Try these AI commands:");
    console.log('   "Create a portfolio with 60% MNT, 40% wETH"');
    console.log('   "Rebalance my portfolio tomorrow at 2pm if MNT is above $2"');
    console.log('   "Set a stop-loss at 20% for my wETH position"');
    
    // Save addresses to file for ElizaOS integration
    const deploymentData = {
        network: "mantle-testnet",
        deployedAt: new Date().toISOString(),
        contracts: {
            TokenFactory: tokenFactoryAddress,
            PortfolioManager: portfolioManagerAddress,
            wETH: tokenAddresses.wETHAddress,
            wBTC: tokenAddresses.wBTCAddress,
            USDT: tokenAddresses.usdtAddress,
            GRANDMA: tokenAddresses.grandmaAddress
        },
        priceFeeds: PRICE_FEEDS
    };
    
    fs.writeFileSync('deployment.json', JSON.stringify(deploymentData, null, 2));
    console.log("📝 Deployment data saved to deployment.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });