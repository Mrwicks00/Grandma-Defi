import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Debugging portfolio creation...");

  // Contract addresses
  const PORTFOLIO_MANAGER_ADDRESS =
    "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";

  // Token addresses
  const TOKENS = {
    MNT: "0x0000000000000000000000000000000000000000",
    wETH: "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece",
    USDT18: "0x5967Fcf4bC4e6B417a6B4B858f96BcFf55E57aAf",
  };

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const PortfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER_ADDRESS
  );

  // Test 1: Check if tokens are actually supported
  console.log("\n🧪 Test 1: Token Support Status");
  for (const [name, address] of Object.entries(TOKENS)) {
    try {
      if (address === TOKENS.MNT) {
        console.log(`✅ ${name}: Native token (always supported)`);
      } else {
        const isSupported = await PortfolioManager.isTokenSupported(address);
        console.log(
          `${isSupported ? "✅" : "❌"} ${name} (${address}): ${isSupported}`
        );

        // Also check price feed
        const priceFeed = await PortfolioManager.priceFeeds(address);
        console.log(`   Price feed: ${priceFeed}`);
      }
    } catch (error) {
      console.log(`❌ ${name}: Error checking support -`, error);
    }
  }

  // Test 2: Check pool states
  console.log("\n🧪 Test 2: AMM Pool States");
  const tokenPairs = [
    ["MNT", "wETH", TOKENS.MNT, TOKENS.wETH],
    ["MNT", "USDT18", TOKENS.MNT, TOKENS.USDT18],
  ];

  for (const [token1Name, token2Name, token1Addr, token2Addr] of tokenPairs) {
    try {
      const reserves = await PortfolioManager.getPoolReserves(
        token1Addr,
        token2Addr
      );
      console.log(
        `${token1Name}/${token2Name} pool reserves: ${ethers.formatEther(reserves[0])} / ${ethers.formatEther(reserves[1])}`
      );
    } catch (error) {
      console.log(
        `❌ ${token1Name}/${token2Name} pool: Error getting reserves`
      );
    }
  }

  // Test 3: Check contract state
  console.log("\n🧪 Test 3: Contract State");
  try {
    const nextPortfolioId = await PortfolioManager.nextPortfolioId();
    console.log("Next portfolio ID:", nextPortfolioId.toString());

    const userPortfolios = await PortfolioManager.getUserPortfolios(
      deployer.address
    );
    console.log(
      "Current user portfolios:",
      userPortfolios.map((id: any) => id.toString())
    );
  } catch (error) {
    console.log("❌ Error checking contract state:", error);
  }

  // Test 4: Try to simulate the transaction with different configurations
  console.log("\n🧪 Test 4: Simulation Tests");

  const testConfigs = [
    {
      name: "Original config (MNT/wETH/USDT18)",
      tokens: [TOKENS.MNT, TOKENS.wETH, TOKENS.USDT18],
      allocations: [4000, 4000, 2000],
      value: ethers.parseEther("20"),
    },
    {
      name: "MNT only",
      tokens: [TOKENS.MNT],
      allocations: [10000],
      value: ethers.parseEther("5"),
    },
    {
      name: "MNT + wETH only",
      tokens: [TOKENS.MNT, TOKENS.wETH],
      allocations: [5000, 5000],
      value: ethers.parseEther("10"),
    },
  ];

  for (const config of testConfigs) {
    console.log(`\n📋 Testing: ${config.name}`);
    console.log(`Tokens: ${config.tokens}`);
    console.log(`Allocations: ${config.allocations}`);
    console.log(`Value: ${ethers.formatEther(config.value)} MNT`);

    try {
      // Try to estimate gas first
      const gasEstimate = await PortfolioManager.createPortfolio.estimateGas(
        config.tokens,
        config.allocations,
        500, // 5% rebalance threshold
        { value: config.value }
      );
      console.log(`✅ Gas estimate: ${gasEstimate.toString()}`);

      // If gas estimation works, the transaction should work
      console.log(`✅ ${config.name} should work!`);
    } catch (error) {
      console.log(`❌ ${config.name} failed:`, error);

      // Try to get more specific error info
      try {
        const tx = {
          to: PORTFOLIO_MANAGER_ADDRESS,
          data: PortfolioManager.interface.encodeFunctionData(
            "createPortfolio",
            [config.tokens, config.allocations, 500]
          ),
          value: config.value,
        };

        await deployer.call(tx);
      } catch (callError: any) {
        if (callError.reason) {
          console.log(`   Reason: ${callError.reason}`);
        }
        if (callError.data) {
          try {
            const decoded = PortfolioManager.interface.parseError(
              callError.data
            );
            console.log(`   Decoded error: ${decoded?.name} ${decoded?.args}`);
          } catch {
            console.log(`   Raw error data: ${callError.data}`);
          }
        }
      }
    }
  }

  console.log("\n🔍 Debugging complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });














