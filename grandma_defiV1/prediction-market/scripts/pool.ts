import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Debugging pool states...\n");

    const ADDRESSES = {
        PortfolioManager: "0x9F520DE61141f340e1864c9c9b995d8d37ae477B",
        wETH: "0x67c04C2985D47ce3fe126326e96598d43edd25c9",
        USDT: "0xA1dE30425f8635a202A97A129dB2af44632ABaA7"
    };

    const portfolioManager = await ethers.getContractAt("PortfolioManager", ADDRESSES.PortfolioManager);

    try {
        // Check if pools exist and have liquidity
        console.log("📊 Pool states:");
        
        // We need to call the public mapping directly since there's no getter
        // Let's try to create a simple MNT-only portfolio first to avoid AMM issues
        
        console.log("🧪 Trying MNT-only portfolio...");
        const tx = await portfolioManager.createPortfolio(
            [ethers.ZeroAddress], // Only MNT
            [10000], // 100% MNT
            1000, // 10% threshold
            { value: ethers.parseEther("1") } // Smaller amount
        );
        await tx.wait();
        console.log("✅ MNT-only portfolio created!");

        // Check the portfolio
        const portfolio = await portfolioManager.getPortfolio(1);
        console.log("📊 Portfolio created:");
        console.log("   Owner:", portfolio.owner);
        console.log("   Tokens:", portfolio.tokens);
        console.log("   Balances:", portfolio.currentBalances);
        console.log("   Active:", portfolio.active);

    } catch (error: any) {
        console.log("❌ Even MNT-only failed:", error.message);
        
        // The issue might be in _initializeTokenTracking or price calculation
        console.log("\n🔍 Let's check the price calculation manually:");
        
        try {
            const mntPrice = await portfolioManager.getTokenPrice(ethers.ZeroAddress);
            console.log("MNT price:", mntPrice.toString());
            
            // Check if the price is causing overflow in value calculations
            const testValue = ethers.parseEther("1"); // 1 MNT
            const priceInWei = BigInt(mntPrice.toString());
            const valueCalc = (testValue * priceInWei) / BigInt(10**18);
            console.log("Value calculation test:", valueCalc.toString());
            
        } catch (priceError: any) {
            console.log("Price error:", priceError.message);
        }
    }
}

main();