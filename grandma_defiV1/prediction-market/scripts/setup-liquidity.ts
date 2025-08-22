import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Simple portfolio creation...\n");

    const ADDRESSES = {
        TokenFactory: "0x118B873495387990eA7E2FF5b8479381f778a5Be",
        PortfolioManager: "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1",
        wETH: "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece",
        wBTC: "0x741986AFAB100Ec4ac2C25a5DD47C35d33f53995",
        USDT: "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F",
        GRANDMA: "0xF57464e2cCfbB909dE54D52d1B9B4847E2bE38b0"
    };

    const PRICE_FEEDS = {
        MNT_USD: "0xD97F20bEbeD74e8144134C4b148fE93417dd0F96", 
        ETH_USD: "0x5bc7Cf88EB131DB18b5d7930e793095140799aD5", 
        BTC_USD: "0x7db2275279F52D0914A481e14c4Ce5a59705A25b",
        USDT_USD: "0xd86048D5e4fe96157CE03Ae519A9045bEDaa6551"
    };


    const liquidityAmounts = {
        wETH: ethers.parseEther("100"), // 100 wETH
        wBTC: ethers.parseUnits("2", 8), // 2 wBTC (8 decimals)
        usdt: ethers.parseUnits("100000", 6), // 200k USDT (6 decimals)
        grandma: ethers.parseEther("10000") // 50k GRANDMA
    };

    const mntLiquidity = ethers.parseEther("100"); // 100 MNT per pool

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Account:", deployer.address);

    // const portfolioManager = await ethers.getContractAt("PortfolioManager", ADDRESSES.PortfolioManager);

    // Get contract instances
    const tokenFactory = await ethers.getContractAt("TokenFactory", ADDRESSES.TokenFactory);
    const portfolioManager = await ethers.getContractAt("PortfolioManager", ADDRESSES.PortfolioManager);
    const wETH = await ethers.getContractAt("MockWETH", ADDRESSES.wETH);
    const wBTC = await ethers.getContractAt("MockWBTC", ADDRESSES.wBTC);
    const usdt = await ethers.getContractAt("MockUSDT", ADDRESSES.USDT);
    const grandma = await ethers.getContractAt("GrandmaToken", ADDRESSES.GRANDMA);

    try {
        // // Step 1: Transfer token ownership back to deployer
        // console.log("🔄 Transferring token ownership back...");
        // await tokenFactory.transferTokenOwnership(deployer.address);
        // console.log("✅ Token ownership transferred\n");


        // console.log("🔗 Setting up price feeds...");
    
    // // Set MNT price feed
    // await portfolioManager.setPriceFeed(ADDRESSES.wETH, PRICE_FEEDS.ETH_USD);
    // console.log("✅ MNT price feed configured");
    
    // // Set GRANDMA price feed to use USDT for now (or deploy a mock price feed)
    // await portfolioManager.setPriceFeed(ADDRESSES.wBTC, PRICE_FEEDS.BTC_USD);
    // console.log("✅ GRANDMA price feed configured (using USDT reference)");

    // await portfolioManager.setPriceFeed(ADDRESSES.USDT, PRICE_FEEDS.USDT_USD);
    // console.log("✅ USDT price feed configured");


        // Step 2: Mint tokens to deployer
        // console.log("🪙 Minting tokens...");
        // await wETH.mint(deployer.address, ethers.parseEther("100000"));
        // console.log("✅ wETH minted");
        
        // await wBTC.mint(deployer.address, ethers.parseUnits("100", 8));
        // console.log("✅ wBTC minted");
        // await usdt.mint(deployer.address, ethers.parseUnits("5000000", 6));
        // console.log("✅ USDT minted");
        // await grandma.mint(deployer.address, ethers.parseEther("1000000"));
        // console.log("✅ GRANDMA minted");
        // console.log("✅ Tokens minted\n");

        // // Step 3: Add liquidity pools
        // console.log("💧 Adding liquidity pools...");
        
        // console.log("   wETH/MNT...");
        // await wETH.approve(ADDRESSES.PortfolioManager, ethers.parseEther("100"));
        // await portfolioManager.addLiquidity(ADDRESSES.wETH, ethers.parseEther("100"), {
        //     value: ethers.parseEther("100")
        // });
        
        // console.log("   USDT/MNT...");
        // await usdt.approve(ADDRESSES.PortfolioManager, ethers.parseUnits("3000", 6));
        // await portfolioManager.addLiquidity(ADDRESSES.USDT, ethers.parseUnits("3000", 6), {
        //     value: ethers.parseEther("100")
        // });

        // console.log("   Adding wBTC/MNT liquidity...");
        // await wBTC.approve(ADDRESSES.PortfolioManager, liquidityAmounts.wBTC);
        // await portfolioManager.addLiquidity(ADDRESSES.wBTC, liquidityAmounts.wBTC, {
        //     value: mntLiquidity
        // });

        // console.log("   Adding GRANDMA/MNT liquidity...");
        // await grandma.approve(ADDRESSES.PortfolioManager, liquidityAmounts.grandma);
        // await portfolioManager.addLiquidity(ADDRESSES.GRANDMA, liquidityAmounts.grandma, {
        //     value: mntLiquidity
        // });

        
        // console.log("✅ Liquidity added\n");

        // Step 4: Create multi-token portfolio

//         const mntFeed = await portfolioManager.priceFeeds(ethers.ZeroAddress);
// const wethFeed = await portfolioManager.priceFeeds(ADDRESSES.wETH);
// console.log("MNT feed address:", mntFeed);
// console.log("wETH feed address:", wethFeed);

//         const isMntSupported = await portfolioManager.isTokenSupported(ethers.ZeroAddress);
// const isWethSupported = await portfolioManager.isTokenSupported(ADDRESSES.wETH);
// const isUsdtSupported = await portfolioManager.isTokenSupported(ADDRESSES.USDT);

// console.log("MNT supported:", isMntSupported);
// console.log("wETH supported:", isWethSupported);
// console.log("USDT supported:", isUsdtSupported);

//         // console.log(ethers.ZeroAddress);
     
//             const mntPrice = await portfolioManager.getTokenPrice(ethers.ZeroAddress);
//             console.log("MNT price:", mntPrice.toString());

        


        // console.log("🧪 Creating test portfolio...");
        // const tx = await portfolioManager.createPortfolio(
        //     [ethers.ZeroAddress, ADDRESSES.wETH, ADDRESSES.USDT], // MNT, wETH, USDT
        //     [5000, 3000, 2000], // 50%, 30%, 20%
        //     1000, // 10% threshold
        //     { value: ethers.parseEther("10") }
        // );
        // await tx.wait();
        // console.log("✅ Portfolio created!");

        // Step 5: Transfer ownership back to PortfolioManager
        // console.log("\n🔄 Transferring ownership back to PortfolioManager...");
        // await tokenFactory.transferTokenOwnership(ADDRESSES.PortfolioManager);
        // console.log("✅ Ownership restored\n");

        // Check portfolio
        const portfolio = await portfolioManager.getPortfolio(3);
        console.log("📊 Portfolio created:");
        console.log("   Owner:", portfolio.owner);
        console.log("   Active:", portfolio.active);
        console.log("   Tokens:", portfolio.tokens.length);

    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Setup failed:", error);
        process.exit(1);
    });