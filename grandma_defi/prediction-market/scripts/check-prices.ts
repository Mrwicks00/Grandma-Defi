import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Chainlink Price Feeds...\n");

  const PORTFOLIO_MANAGER = "0x582cfd332ed983EeFd88B3e5555dC779c7900Dc1";
  const ADDRESSES = {
    MNT: ethers.ZeroAddress, // Native MNT
    wETH: "0xdAAc95929ceC4a5b2f977854868dD20116cF0ece",
    wBTC: "0x741986AFAB100Ec4ac2C25a5DD47C35d33f53995",
    USDT: "0x6db5d0288ADcf2413afA84e06C158a5bDd85460F",
    GRANDMA: "0xF57464e2cCfbB909dE54D52d1B9B4847E2bE38b0",
  };

  // Price feed addresses from your script
  const PRICE_FEEDS = {
    MNT: "0x4c8962833Db7206fd45671e9DC806e4FcC0dCB78",
    wETH: "0x9bD31B110C559884c49d1bA3e60C1724F2E336a7",
    wBTC: "0xecC446a3219da4594d5Ede8314f500212e496E17",
    USDT: "0x71c184d899c1774d597d8D80526FB02dF708A69a",
    GRANDMA: "0x71c184d899c1774d597d8D80526FB02dF708A69a", // Uses USDT feed
  };

  const portfolioManager = await ethers.getContractAt(
    "PortfolioManager",
    PORTFOLIO_MANAGER
  );

  try {
    console.log("📊 PORTFOLIO MANAGER PRICE CHECKS");
    console.log("=".repeat(50));

    for (const [tokenName, tokenAddress] of Object.entries(ADDRESSES)) {
      console.log(
        `\n🔸 ${tokenName} (${tokenAddress === ethers.ZeroAddress ? "Native MNT" : tokenAddress.slice(0, 8) + "..."})`
      );

      try {
        // Get price from portfolio manager
        const price = await portfolioManager.getTokenPrice(tokenAddress);
        console.log(`   📈 Price from contract: ${price.toString()}`);

        // Convert to human readable (assuming 8 decimals for USD price)
        const priceUSD = Number(price) / 1e8;
        console.log(`   💵 Price in USD: $${priceUSD.toFixed(8)}`);

        // Check if price seems reasonable
        if (priceUSD > 100000) {
          console.log(`   ⚠️  WARNING: Price seems unusually high!`);
        } else if (priceUSD < 0.00001) {
          console.log(`   ⚠️  WARNING: Price seems unusually low!`);
        } else {
          console.log(`   ✅ Price seems reasonable`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error getting price: ${error.message}`);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("🔗 DIRECT CHAINLINK FEED CHECKS");
    console.log("=".repeat(50));

    // Check Chainlink feeds directly
    for (const [tokenName, feedAddress] of Object.entries(PRICE_FEEDS)) {
      console.log(`\n🔸 ${tokenName} Feed (${feedAddress.slice(0, 8)}...)`);

      try {
        const feed = await ethers.getContractAt(
          "AggregatorV3Interface",
          feedAddress
        );

        // Get latest round data
        const roundData = await feed.latestRoundData();
        const [roundId, price, startedAt, updatedAt, answeredInRound] =
          roundData;

        console.log(`   📊 Round ID: ${roundId.toString()}`);
        console.log(`   📈 Raw Price: ${price.toString()}`);
        console.log(`   💵 Price USD: $${(Number(price) / 1e8).toFixed(8)}`);
        console.log(
          `   🕐 Updated: ${new Date(Number(updatedAt) * 1000).toLocaleString()}`
        );

        // Check how old the data is
        const ageInMinutes = (Date.now() / 1000 - Number(updatedAt)) / 60;
        if (ageInMinutes > 60) {
          console.log(
            `   ⚠️  WARNING: Data is ${ageInMinutes.toFixed(1)} minutes old!`
          );
        } else {
          console.log(
            `   ✅ Data is fresh (${ageInMinutes.toFixed(1)} minutes old)`
          );
        }

        // Get feed description if available
        try {
          const description = await feed.description();
          console.log(`   📝 Description: ${description}`);
        } catch {
          console.log(`   📝 Description: Not available`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error reading feed: ${error.message}`);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("🧮 PORTFOLIO VALUE CALCULATION TEST");
    console.log("=".repeat(50));

    // Test with a sample portfolio (if any exist)
    try {
      console.log("\n🔍 Checking existing portfolios...");

      // Try to get portfolio 6 (from your previous tests)
      const portfolio = await portfolioManager.getPortfolio(6);
      console.log("\n📊 Portfolio #6 Analysis:");
      console.log(`   👤 Owner: ${portfolio.owner}`);
      console.log(`   🎯 Tokens: ${portfolio.tokens.length}`);
      console.log(`   ✅ Active: ${portfolio.active}`);
      console.log(
        `   💰 Total Value USD (raw): ${portfolio.totalValueUSD.toString()}`
      );
      console.log(
        `   💰 Total Value USD (formatted): $${(Number(portfolio.totalValueUSD) / 1e8).toFixed(2)}`
      );

      // Check individual token balances and values
      for (let i = 0; i < portfolio.tokens.length; i++) {
        const tokenAddr = portfolio.tokens[i];
        const balance = portfolio.currentBalances[i];
        const allocation = portfolio.targetAllocations[i];

        const tokenName =
          Object.keys(ADDRESSES).find(
            (key) => ADDRESSES[key as keyof typeof ADDRESSES] === tokenAddr
          ) || "Unknown";

        console.log(`\n   🔸 ${tokenName}:`);
        console.log(`     📍 Address: ${tokenAddr}`);
        console.log(`     💎 Balance (raw): ${balance.toString()}`);
        console.log(`     📊 Target Allocation: ${Number(allocation) / 100}%`);

        // Try to get price and calculate value
        try {
          const price = await portfolioManager.getTokenPrice(tokenAddr);
          console.log(`     💵 Price: $${(Number(price) / 1e8).toFixed(8)}`);

          // Calculate token value (balance * price / 1e18 for token decimals)
          const tokenValueUSD = (Number(balance) * Number(price)) / 1e26; // 1e18 for token + 1e8 for price
          console.log(`     💰 Value: $${tokenValueUSD.toFixed(2)}`);

          // Format balance to human readable
          const humanBalance = Number(balance) / 1e18;
          console.log(
            `     💎 Balance (formatted): ${humanBalance.toFixed(6)} ${tokenName}`
          );
        } catch (error: any) {
          console.log(`     ❌ Price error: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.log(`❌ Error checking portfolio: ${error.message}`);
    }

    console.log("\n🎉 Price feed analysis complete!");
  } catch (error: any) {
    console.log("❌ General Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });














