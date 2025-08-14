import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Creating multi-token portfolio step by step...\n");

    const ADDRESSES = {
        PortfolioManager: "0x9F520DE61141f340e1864c9c9b995d8d37ae477B",
        wETH: "0x67c04C2985D47ce3fe126326e96598d43edd25c9",
        USDT: "0xA1dE30425f8635a202A97A129dB2af44632ABaA7"
    };

    const portfolioManager = await ethers.getContractAt("PortfolioManager", ADDRESSES.PortfolioManager);

    try {
        // Strategy: Start with high MNT allocation to minimize swapping
        console.log("🧪 Creating portfolio with minimal swapping needed...");
        
        const tx = await portfolioManager.createPortfolio(
            [ethers.ZeroAddress, ADDRESSES.wETH, ADDRESSES.USDT],
            [8000, 1000, 1000], // 80% MNT, 10% wETH, 10% USDT (minimal swaps)
            1000, // 10% threshold
            { value: ethers.parseEther("5") } // Medium amount
        );
        await tx.wait();
        console.log("✅ Multi-token portfolio created!");

        // Check the portfolio
        const portfolio = await portfolioManager.getPortfolio(2); // Should be portfolio #2
        console.log("📊 Portfolio created:");
        console.log("   Owner:", portfolio.owner);
        console.log("   Tokens:", portfolio.tokens.length);
        console.log("   Target allocations:", portfolio.targetAllocations);
        console.log("   Current balances:", portfolio.currentBalances);
        console.log("   Active:", portfolio.active);

    } catch (error: any) {
        console.log("❌ Multi-token still failed:", error.message);
        console.log("\n💡 The AMM swap math needs fixing in your contract.");
        console.log("   For now, stick with MNT-only portfolios or fix the _swapToToken function.");
        
        // Alternative: Try with even higher MNT allocation
        try {
            console.log("\n🔄 Trying with 95% MNT allocation...");
            const tx2 = await portfolioManager.createPortfolio(
                [ethers.ZeroAddress, ADDRESSES.wETH],
                [9500, 500], // 95% MNT, 5% wETH
                1000,
                { value: ethers.parseEther("2") }
            );
            await tx2.wait();
            console.log("✅ High-MNT portfolio worked!");
        } catch (error2: any) {
            console.log("❌ Even 95% MNT failed:", error2.message);
        }
    }
}

main();