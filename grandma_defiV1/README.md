# Grandma DeFi - Agentic Consumer DeFi on Mantle Network

> **"If your grandma can do it, anyone can do it!"** 🎯

![grandma's-defi img](grandma.png)

An AI-powered DeFi platform that makes decentralized finance accessible to everyone through natural language interaction, gasless smart wallets, and cross-chain portfolio management powered by Orby.

## 🚀 What It Does

Grandma DeFi transforms complex DeFi operations into simple conversations:

- **🤖 AI Assistant**: Natural language commands for all DeFi operations
- **⚡ Gasless Smart Wallets**: ERC-4337 accounts powered by Pimlico
- **🔗 MetaMask Integration**: Import existing wallets seamlessly
- **📊 Real-time DeFi Data**: Live yield opportunities and protocol information
- **🔄 Batch Transactions**: Multiple operations in a single gasless transaction
- **🌐 Cross-Chain Holdings**: Unified portfolio view across all chains via Orby
- **💼 Portfolio Management**: Automated DeFi strategies and yield farming
- **🌉 Cross-Chain Bridging**: Seamless asset transfers between networks

## ✨ Key Features

### Smart Wallet Management

- Create new ERC-4337 smart wallets instantly
- Import existing MetaMask wallets with private key
- Gasless transactions on Mantle Network
- Social recovery ready
- Multi-wallet support with individual management

### AI-Powered Commands

```
"Create a new wallet"
"Import my MetaMask wallet"
"Send 0.1 MNT to 0x1234..."
"Check my balance"
"Show me yield opportunities"
"Batch send from wallet 1"
"Show my holdings across all chains"
"Create portfolio with $100"
"Bridge 0.5 ETH from Ethereum to Mantle"
```

### Cross-Chain Portfolio Analysis

- **Orby Integration**: Unified view of all your tokens across multiple chains
- **Real-time Holdings**: Live token balances and USD values
- **Chain Distribution**: See how your wealth is distributed across networks
- **Gas Optimization**: Identify the best tokens for gas payments
- **Multi-chain Support**: Ethereum, Mantle, Polygon, Arbitrum, Optimism, Base, BSC, and more

### DeFi Integration

- Real-time yield data from DeFiLlama
- Protocol recommendations
- TVL tracking
- Top chains and protocols information
- Automated portfolio strategies

### Cross-Chain Bridging

- Bridge assets between major networks
- Support for Ethereum, Mantle, Polygon, and more
- Optimized routing for best rates
- Gas cost estimation

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: ElizaOS AI Framework
- **Blockchain**: Mantle Network (Sepolia testnet) + Multi-chain support
- **Smart Accounts**: ERC-4337 with Pimlico
- **DeFi Data**: DeFiLlama API
- **Cross-Chain**: Orby Protocol integration
- **AI**: OpenAI/Anthropic integration
- **Portfolio Management**: Automated DeFi strategies

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- MetaMask wallet (optional)
- Orby API access (for cross-chain features)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd grandma_defi

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Add your API keys to .env

# Start development server
npm run dev
# or
bun run dev
```

### Environment Variables

```env
# AI Provider (choose one)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_SMALL_MODEL=mistralai/mistral-small-3.2-24b-instruct:free
OPENROUTER_LARGE_MODEL=mistralai/mistral-small-3.2-24b-instruct:free
OPENROUTER_IMAGE_MODEL=mistralai/mistral-small-3.2-24b-instruct:free

PIMLICO_API_KEY=your-pimlico_key

# Orby Integration (for cross-chain features)
ORBY_PRIVATE_INSTANCE_URL=your_orby_url

# Optional: Discord/Telegram bots
DISCORD_API_TOKEN=your_discord_token
TELEGRAM_BOT_TOKEN=your_telegram_token
```

## 🎯 Usage Examples

### Creating a Wallet

```
User: "I need a new wallet"
AI: ✅ Your new smart wallet has been created!
    📍 Smart Contract Address: 0x...
    🔑 EOA Address: 0x...
    🔐 Private Key: 0x...
    🌐 Network: Mantle Sepolia Testnet
```

### Cross-Chain Holdings Analysis

```
User: "Show my holdings across all chains"
AI: 💎 PORTFOLIO OVERVIEW (Orby-Powered)

    🔗 Wallet: 0xB240...909a
    💰 Total Value: $1,230.05
    🌐 Coverage: 9 chains • 9 tokens

    📊 CHAIN DISTRIBUTION
    🥇 Ethereum Sepolia $1,021.85 (83.1%)
    🥈 Optimism Sepolia $1,021.85 (83.1%)
    🥉 Arbitrum Sepolia $1,021.85 (83.1%)

    🪙 TOKEN BREAKDOWN
    │ ETH 0.0500 $993.30 • Holesky
    │ USDC <0.001 $28.55 • Ethereum Sepolia
    │ MNT 0.1234 $123.86 • Mantle Sepolia
```

### Portfolio Management

```
User: "Create portfolio with $100"
AI: 🎯 Creating your DeFi portfolio...
    💰 Initial Investment: $100
    📊 Strategy: Balanced (Yield + Growth)
    🔄 Auto-rebalancing: Enabled
    📈 Expected APY: 8-15%
```



## 🧪 Testing

```bash
# Run all tests
npm test

# Component tests only
npm run test:component

# E2E tests only
npm run test:e2e

# Cypress tests
npm run cy:test
```

## 📁 Project Structure

```
src/
├── smart-account-plugin/     # ERC-4337 wallet management
│   ├── action.ts            # Wallet actions (create, import, send)
│   ├── holdingsActions.ts   # Cross-chain holdings analysis
│   ├── eoaActions.ts        # EOA wallet management
│   ├── service.ts           # Pimlico wallet service
│   └── provider.ts          # Blockchain interactions
├── portfolio-plugin/         # DeFi portfolio management
│   ├── service.ts           # Portfolio service
│   ├── actions/             # Portfolio actions
│   └── keeper/              # Automated strategies
├── bridge-plugin/            # Cross-chain bridging
│   ├── action.ts            # Bridge actions
│   ├── service.ts           # Bridge service
│   └── provider.ts          # Bridge providers
├── defillama-plugin/        # DeFi data integration
│   ├── action.ts            # DeFi data actions
│   ├── service.ts           # DeFiLlama service
│   └── provider.ts          # API interactions
├── frontend/                # React UI components
└── index.ts                 # Main entry point
```

## 🔧 Development

```bash
# Start development with hot-reloading
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Format code
npm run format
```

## 🌐 Network Information

### Primary Network

- **Network**: Mantle Sepolia Testnet
- **Chain ID**: 5003
- **RPC URL**: https://rpc.sepolia.mantle.xyz
- **Explorer**: https://sepolia.mantlescan.xyz
- **Faucet**: https://faucet.sepolia.mantle.xyz

### Supported Networks (via Orby)

- **Ethereum**: Mainnet, Sepolia, Goerli
- **Mantle**: Mainnet, Testnet, Sepolia
- **Polygon**: Mainnet, Mumbai, Amoy
- **Arbitrum**: One, Goerli, Sepolia
- **Optimism**: Mainnet, Goerli, Sepolia
- **Base**: Mainnet, Goerli, Sepolia
- **BSC**: Mainnet, Testnet
- **Holesky**: Testnet
- **Sonic**: Testnet

## 🚀 Advanced Features

### Cross-Chain Holdings

- **Unified View**: See all your tokens across all chains in one place
- **Real-time Updates**: Live balance and value updates
- **Gas Optimization**: Identify the best tokens for gas payments on each chain
- **Portfolio Analytics**: Chain distribution and token breakdown

### Portfolio Management

- **Automated Strategies**: Set-and-forget DeFi strategies
- **Yield Farming**: Optimize for highest APY opportunities
- **Risk Management**: Diversified portfolio allocation
- **Performance Tracking**: Monitor your DeFi returns

### Smart Account Features

- **Gasless Transactions**: No more gas fees for basic operations
- **Batch Transactions**: Multiple operations in one transaction
- **Social Recovery**: Secure wallet recovery options
- **Multi-signature**: Enhanced security for large transactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Mantle Network](https://mantle.xyz/) for the blockchain infrastructure
- [Pimlico](https://pimlico.io/) for gasless smart account technology
- [Orby Protocol](https://orby.xyz/) for cross-chain portfolio unification
- [DeFiLlama](https://defillama.com/) for DeFi data
- [ElizaOS](https://elizaos.com/) for the AI framework

---

**Built with ❤️ for the Mantle Hackathon**

_Making DeFi accessible to everyone, one grandma at a time!_ 👵💙
