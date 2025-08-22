// import { ethers } from "ethers";
// import { OrbyProvider } from "@orb-labs/orby-ethers6";
// import { Account } from "@orb-labs/orby-core";

// // Helper function to get chain names
// function getChainName(chainId: string): string {
//   const chains: Record<string, string> = {
//     "1": "Ethereum Mainnet",
//     "5": "Ethereum Goerli",
//     "11155111": "Ethereum Sepolia",
//     "137": "Polygon Mainnet",
//     "80001": "Polygon Mumbai",
//     "80002": "Polygon Amoy",
//     "42161": "Arbitrum One",
//     "421613": "Arbitrum Goerli",
//     "421614": "Arbitrum Sepolia",
//     "10": "Optimism Mainnet",
//     "420": "Optimism Goerli",
//     "8453": "Base Mainnet",
//     "84531": "Base Goerli",
//     "84532": "Base Sepolia",
//     "5000": "Mantle Mainnet",
//     "5001": "Mantle Testnet",
//     "5003": "Mantle Sepolia",
//     "56": "BSC Mainnet",
//     "97": "BSC Testnet",
//   };
//   return chains[chainId] || `Chain ${chainId}`;
// }

// async function debugOrbyPortfolio() {
//   console.log("🔍 Debugging Orby Portfolio Structure...\n");

//   // Configuration
//   const PRIVATE_KEY =
//     "0x5b90cef199f099e31c9a05db07b10525a16cf0d3a1e63073fdf1acbb8d1ba38f";
//   const ORBY_PRIVATE_INSTANCE_URL =
//     process.env.ORBY_PRIVATE_INSTANCE_URL ||
//     "https://api-rpc-dev.orblabs.xyz/df9b31c5-8241-4e49-9f9e-57c685af4394/testnet";

//   // Chain IDs to fetch from (modify this array to limit chains)
//   const CHAIN_IDS_TO_FETCH = [
//     BigInt(5003), // Mantle Sepolia (Testnet)
//     // BigInt(5000),     // Mantle Mainnet
//     // BigInt(1),        // Ethereum Mainnet
//     // BigInt(11155111), // Ethereum Sepolia
//     // BigInt(137),      // Polygon Mainnet
//     // BigInt(80002),    // Polygon Amoy (Testnet)
//     // BigInt(42161),    // Arbitrum One
//     // BigInt(421614),   // Arbitrum Sepolia
//     // BigInt(8453),     // Base Mainnet
//     // BigInt(84532),    // Base Sepolia
//   ];

//   console.log("🌐 Chain IDs to fetch:");
//   CHAIN_IDS_TO_FETCH.forEach((chainId) => {
//     const chainName = getChainName(chainId.toString());
//     console.log(`   • ${chainName} (${chainId})`);
//   });
//   console.log();

//   if (!process.env.ORBY_PRIVATE_INSTANCE_URL) {
//     console.warn(
//       "⚠️  ORBY_PRIVATE_INSTANCE_URL not found in environment, using placeholder URL"
//     );
//     console.log(
//       "Add to .env: ORBY_PRIVATE_INSTANCE_URL=https://your-orby-instance.com"
//     );
//   }

//   try {
//     // Setup Orby following the same pattern as service.ts
//     console.log("⚙️  Setting up Orby...");
//     console.log(`🔗 Using Orby URL: ${ORBY_PRIVATE_INSTANCE_URL}`);
//     const privateInstanceProvider = new OrbyProvider(ORBY_PRIVATE_INSTANCE_URL);

//     // Create wallet from private key
//     const wallet = new ethers.Wallet(PRIVATE_KEY);
//     console.log(`📧 Wallet Address: ${wallet.address}\n`);

//     // Create account and cluster (following service.ts pattern)
//     const accounts = [
//       Account.toAccount({
//         vmType: "EVM",
//         address: wallet.address,
//         accountType: "EOA",
//       }),
//     ];
//     const accountCluster =
//       await privateInstanceProvider.createAccountCluster(accounts);

//     if (!accountCluster) {
//       throw new Error("Failed to create account cluster");
//     }

//     console.log("🔄 Fetching portfolio from Orby across selected chains...");

//     let allPortfolioData = [];
//     let successfulChains = 0;
//     let failedChains = 0;

//     for (const chainId of CHAIN_IDS_TO_FETCH) {
//       const chainName = getChainName(chainId.toString());
//       console.log(`📡 Fetching from ${chainName} (${chainId})...`);

//       try {
//         // Create virtual node for this specific chain
//         const virtualNodeRpcUrl =
//           await privateInstanceProvider.getVirtualNodeRpcUrl(
//             accountCluster.accountClusterId,
//             chainId,
//             wallet.address
//           );

//         if (!virtualNodeRpcUrl) {
//           console.log(`   ❌ No virtual node URL for ${chainName}`);
//           failedChains++;
//           continue;
//         }

//         const virtualNodeProvider = new OrbyProvider(virtualNodeRpcUrl);
//         const chainPortfolio =
//           await virtualNodeProvider.getFungibleTokenPortfolio(accountCluster);

//         console.log(
//           `   ✅ ${chainName}: Found ${chainPortfolio.length} token types`
//         );

//         // Add chain info to each token for debugging
//         const chainPortfolioWithMeta = chainPortfolio.map((token) => ({
//           ...token,
//           _debugChainId: chainId.toString(),
//           _debugChainName: chainName,
//         }));

//         allPortfolioData.push(...chainPortfolioWithMeta);
//         successfulChains++;
//       } catch (error) {
//         console.log(`   ❌ ${chainName}: ${error.message}`);
//         failedChains++;
//       }
//     }

//     console.log(
//       `\n📊 Chain Summary: ${successfulChains} successful, ${failedChains} failed`
//     );
//     console.log(
//       `✅ Total portfolio data: Found ${allPortfolioData.length} token entries\n`
//     );

//     const portfolio = allPortfolioData;

//     // Debug the exact structure
//     console.log("📊 FULL PORTFOLIO STRUCTURE:");
//     console.log("=" * 50);
//     console.log(JSON.stringify(portfolio, null, 2));
//     console.log("=" * 50);

//     // Analyze each token
//     console.log("\n🔍 ANALYZING EACH TOKEN:");
//     portfolio.forEach((token, index) => {
//       console.log(`\n--- TOKEN ${index + 1} ---`);
//       console.log(`standardizedTokenId: ${token.standardizedTokenId}`);
//       if (token._debugChainName) {
//         console.log(
//           `🌐 Chain: ${token._debugChainName} (${token._debugChainId})`
//         );
//       }

//       // Check total structure
//       console.log("📈 TOTAL structure:");
//       if (token.total) {
//         console.log(`  - numerator: ${JSON.stringify(token.total.numerator)}`);
//         console.log(
//           `  - denominator: ${JSON.stringify(token.total.denominator)}`
//         );
//         console.log(
//           `  - currency: ${token.total.currency?.symbol} (${token.total.currency?.name})`
//         );
//       } else {
//         console.log("  - ❌ No 'total' property found");
//       }

//       // Check totalValueInFiat structure
//       console.log("💰 TOTAL VALUE IN FIAT structure:");
//       if (token.totalValueInFiat) {
//         console.log(
//           `  - numerator: ${JSON.stringify(token.totalValueInFiat.numerator)}`
//         );
//         console.log(
//           `  - denominator: ${JSON.stringify(token.totalValueInFiat.denominator)}`
//         );
//         console.log(`  - currency: ${token.totalValueInFiat.currency?.symbol}`);

//         // Try to extract value
//         try {
//           const numeratorArray = token.totalValueInFiat
//             .numerator as unknown as any[];
//           if (numeratorArray.length > 0) {
//             const firstElement = numeratorArray[0];
//             const valueInDollars = Number(firstElement) / 1000000;
//             console.log(
//               `  - 💵 Calculated value: $${valueInDollars.toFixed(6)}`
//             );
//           }
//         } catch (error) {
//           console.log(`  - ❌ Error calculating value: ${error.message}`);
//         }
//       } else {
//         console.log("  - ❌ No 'totalValueInFiat' property found");
//       }

//       // Check token balances
//       console.log(
//         `🪙 TOKEN BALANCES (${token.tokenBalances?.length || 0} entries):`
//       );
//       token.tokenBalances?.forEach((balance, balanceIndex) => {
//         console.log(`  Balance ${balanceIndex + 1}:`);
//         console.log(
//           `    - Token: ${balance.token?.symbol} (${balance.token?.name})`
//         );
//         console.log(`    - Chain: ${balance.token?.chainId}`);
//         console.log(`    - Numerator: ${JSON.stringify(balance.numerator)}`);

//         // Try to extract amount
//         try {
//           const numeratorArray = balance.numerator as unknown as any[];
//           if (numeratorArray.length > 0) {
//             let amount = Number(numeratorArray[0]);
//             if (numeratorArray.length > 1) {
//               amount += Number(numeratorArray[1]) * Math.pow(2, 32);
//             }
//             const decimals = balance.token?.decimals || 18;
//             const readableAmount = amount / Math.pow(10, decimals);
//             console.log(
//               `    - 📊 Calculated amount: ${readableAmount.toFixed(6)} ${balance.token?.symbol}`
//             );
//           }
//         } catch (error) {
//           console.log(`    - ❌ Error calculating amount: ${error.message}`);
//         }
//       });
//     });

//     // Summary
//     console.log("\n📊 SUMMARY:");
//     let totalValue = 0;
//     portfolio.forEach((token) => {
//       try {
//         if (token.totalValueInFiat && token.totalValueInFiat.numerator) {
//           const numeratorArray = token.totalValueInFiat
//             .numerator as unknown as any[];
//           if (numeratorArray.length > 0) {
//             const value = Number(numeratorArray[0]) / 1000000;
//             totalValue += value;
//           }
//         }
//       } catch (error) {
//         console.log(`Failed to calculate value for token: ${error.message}`);
//       }
//     });

//     console.log(`💰 Total Portfolio Value: $${totalValue.toFixed(2)}`);
//     console.log(`🪙 Total Token Types: ${portfolio.length}`);

//     // Check for common issues
//     console.log("\n🔧 DIAGNOSTIC CHECKS:");
//     const hasEmpty = portfolio.some(
//       (token) => !token.totalValueInFiat || !token.totalValueInFiat.numerator
//     );
//     const hasZeroBalance = portfolio.some((token) => {
//       try {
//         const numeratorArray = token.totalValueInFiat
//           ?.numerator as unknown as any[];
//         return (
//           !numeratorArray ||
//           numeratorArray.length === 0 ||
//           numeratorArray[0] === 0
//         );
//       } catch {
//         return true;
//       }
//     });

//     console.log(
//       `- Empty totalValueInFiat: ${hasEmpty ? "❌ Found" : "✅ None"}`
//     );
//     console.log(
//       `- Zero balance tokens: ${hasZeroBalance ? "⚠️  Found" : "✅ None"}`
//     );
//   } catch (error) {
//     console.error("❌ Error debugging portfolio:", error);
//     console.error("Stack:", error.stack);

//     // Additional debugging info
//     console.log("\n🔍 Additional Debug Info:");
//     console.log(`- Error type: ${error.constructor.name}`);
//     console.log(`- Error message: ${error.message}`);

//     if (
//       error.message.includes("network") ||
//       error.message.includes("connection")
//     ) {
//       console.log("\n💡 This looks like a network issue. Try:");
//       console.log("- Check your internet connection");
//       console.log("- Make sure Orby services are available");
//       console.log("- Try again in a few minutes");
//     }
//   }
// }

// // Self-executing function
// (async () => {
//   await debugOrbyPortfolio();
// })().catch((error) => {
//   console.error("Fatal error:", error);
//   process.exit(1);
// });
