# Grandma DeFi - Agentic Consumer DeFi on Mantle Network

> **"If your grandma can do it, anyone can do it!"** 🎯

![grandma's-defi img](grandma.png)

An AI-powered DeFi platform that makes decentralized finance accessible to everyone through natural language interaction and gasless smart wallets.

## 🚀 What It Does

Grandma DeFi transforms complex DeFi operations into simple conversations:

- **🤖 AI Assistant**: Natural language commands for all DeFi operations
- **⚡ Gasless Smart Wallets**: ERC-4337 accounts powered by Pimlico
- **🔗 MetaMask Integration**: Import existing wallets seamlessly
- **📊 Real-time DeFi Data**: Live yield opportunities and protocol information
- **🔄 Batch Transactions**: Multiple operations in a single gasless transaction

## ✨ Key Features

### Smart Wallet Management

- Create new ERC-4337 smart wallets instantly
- Import existing MetaMask wallets with private key
- Gasless transactions on Mantle Network
- Social recovery ready

### AI-Powered Commands

```
"Create a new wallet"
"Import my MetaMask wallet"
"Send 0.1 MNT to 0x1234..."
"Check my balance"
"Show me yield opportunities"
"Batch send from wallet 1"
```

### DeFi Integration

- Real-time yield data from DeFiLlama
- Protocol recommendations
- TVL tracking
- Top chains and protocols information

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: ElizaOS AI Framework
- **Blockchain**: Mantle Network (Sepolia testnet)
- **Smart Accounts**: ERC-4337 with Pimlico
- **DeFi Data**: DeFiLlama API
- **AI**: OpenAI/Anthropic integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- MetaMask wallet (optional)

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

### Sending Transactions

```
User: "Send 0.1 MNT from wallet 1 to 0x1234..."
AI: ✅ Transaction sent successfully!
    💸 Amount: 0.1 MNT
    🧾 Transaction Hash: 0x...
    🎉 Completely gasless - no fees charged!
```

### DeFi Information

```
User: "Show me yield opportunities"
AI: 📊 Here are some of the top yield-earning opportunities on Mantle:
    1. Protocol Name
       - Asset: MNT
       - APY: 12.5%
       - TVL: $1,234,567
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
│   ├── service.ts           # Pimlico wallet service
│   └── provider.ts          # Blockchain interactions
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

- **Network**: Mantle Sepolia Testnet
- **Chain ID**: 5003
- **RPC URL**: https://rpc.sepolia.mantle.xyz
- **Explorer**: https://sepolia.mantlescan.xyz
- **Faucet**: https://faucet.sepolia.mantle.xyz

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
- [DeFiLlama](https://defillama.com/) for DeFi data
- [ElizaOS](https://elizaos.com/) for the AI framework

---

**Built with ❤️ for the Mantle Hackathon**

_Making DeFi accessible to everyone, one grandma at a time!_ 👵💙
