import { ethers } from "hardhat";

async function main() {
    console.log("🔧 Adding liquidity then creating portfolio...\n");

    const ADDRESSES = {
        TokenFactory: "0xddE0c839D2572FdA39bA3Ae9208048E41b4cB31b",
        PortfolioManager: "0x9F520DE61141f340e1864c9c9b995d8d37ae477B",
        wETH: "0x67c04C2985D47ce3fe126326e96598d43edd25c9",
        USDT: "0xA1dE30425f8635a202A97A129dB2af44632ABaA7"
    };

    const [deployer] = await ethers.getSigners();
    console.log("🔑 Account:", deployer.address);

    const tokenFactory = await ethers.getContractAt("TokenFactory", ADDRESSES.TokenFactory);
    const portfolioManager = await ethers.getContractAt("PortfolioManager", ADDRESSES.PortfolioManager);
    const wETH = await ethers.getContractAt("MockWETH", ADDRESSES.wETH);
    const usdt = await ethers.getContractAt("MockUSDT", ADDRESSES.USDT);

    try {
        // Step 1: Transfer ownership to deployer to mint tokens
        // console.log("🔄 Taking token ownership...");
        // await tokenFactory.transferTokenOwnership(deployer.address);

        // // Step 2: Mint tokens
        // console.log("🪙 Minting tokens...");
        // await wETH.mint(deployer.address, ethers.parseEther("1000"));
        // await usdt.mint(deployer.address, ethers.parseUnits("50000", 6));
        // console.log("✅ Tokens minted");

        // Step 3: Add liquidity pools (THIS IS CRITICAL!)
        console.log("💧 Adding liquidity pools...");
        
        await wETH.approve(ADDRESSES.PortfolioManager, ethers.parseEther("10000"));
        await portfolioManager.addLiquidity(ADDRESSES.wETH, ethers.parseEther("10000"), {
            value: ethers.parseEther("50") // 50 MNT
        });
        console.log("✅ wETH/MNT liquidity added");
        
        await usdt.approve(ADDRESSES.PortfolioManager, ethers.parseUnits("150000", 6));
        await portfolioManager.addLiquidity(ADDRESSES.USDT, ethers.parseUnits("150000", 6), {
            value: ethers.parseEther("50") // 50 MNT
        });
        console.log("✅ USDT/MNT liquidity added");

        // // Step 4: Transfer ownership back
        // await tokenFactory.transferTokenOwnership(ADDRESSES.PortfolioManager);
        // console.log("✅ Ownership restored");

        // Step 5: Now create portfolio
        console.log("🧪 Creating portfolio...");
        const tx = await portfolioManager.createPortfolio(
            [ethers.ZeroAddress, ADDRESSES.wETH, ADDRESSES.USDT],
            [5000, 3000, 2000], // 50%, 30%, 20%
            1000, // 10% threshold
            { value: ethers.parseEther("10") }
        );
        await tx.wait();
        console.log("✅ Portfolio created!");

        // Check result
        const portfolio = await portfolioManager.getPortfolio(1);
        console.log("📊 Portfolio:");
        console.log("   Owner:", portfolio.owner);
        console.log("   Tokens:", portfolio.tokens.length);
        console.log("   Active:", portfolio.active);

    } catch (error: any) {
        console.log("❌ Error:", error.message);
    }
}

main();