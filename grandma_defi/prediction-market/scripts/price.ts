import { ethers } from "hardhat";

async function main() {
    console.log("🔄 Resetting price feeds...");

    const PORTFOLIO_MANAGER = "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";
    const ADDRESSES = {
        wETH: "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece",
        USDT: "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F",
        wBTC: "0x741986AFAB100Ec4ac2C25a5DD47C35d33f53995",
        grandma: "0xF57464e2cCfbB909dE54D52d1B9B4847E2bE38b0"
    };

  
    const mntFeed = "0x4c8962833Db7206fd45671e9DC806e4FcC0dCB78";
    const wethFeed = "0x9bD31B110C559884c49d1bA3e60C1724F2E336a7";
    const usdtFeed = "0x71c184d899c1774d597d8D80526FB02dF708A69a";
    const btcFeed = "0xecC446a3219da4594d5Ede8314f500212e496E17";
    const grandmaFeed = "0x71c184d899c1774d597d8D80526FB02dF708A69a";


    const portfolioManager = await ethers.getContractAt("PortfolioManager", PORTFOLIO_MANAGER);

    try {
        // // Reset MNT price feed
        // await portfolioManager.setPriceFeed(ethers.ZeroAddress, mntFeed);
        // console.log("✅ MNT price feed reset");

        // // Reset wETH price feed  
        // await portfolioManager.setPriceFeed(ADDRESSES.wETH, wethFeed);
        // console.log("✅ wETH price feed reset");

        // Reset USDT price feed
        await portfolioManager.setPriceFeed(ADDRESSES.USDT, usdtFeed);
        console.log("✅ USDT price feed reset");

        await portfolioManager.setPriceFeed(ADDRESSES.wBTC, btcFeed)
        console.log("btc price feed reset");

        await portfolioManager.setPriceFeed(ADDRESSES.grandma, grandmaFeed)
        console.log("grandma price feed reset");
        
        

        console.log("🎉 All price feeds reset!");
    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }
}

main();