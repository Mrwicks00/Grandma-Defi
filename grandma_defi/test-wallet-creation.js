// Simple test script to verify wallet creation
console.log("Testing wallet creation functionality...");

// Simulate the wallet creation process
async function testWalletCreation() {
  console.log("1. Testing wallet creation validation...");

  // Test validation logic
  const testMessages = [
    "create wallet",
    "new wallet",
    "make wallet",
    "generate wallet",
    "create a wallet",
    "I want a wallet",
    "show my balance", // Should not trigger wallet creation
    "send transaction", // Should not trigger wallet creation
  ];

  const walletCreationKeywords = [
    "create wallet",
    "new wallet",
    "make wallet",
    "generate wallet",
    "create a wallet",
    "make a wallet",
    "generate a wallet",
    "wallet creation",
    "create smart wallet",
    "new smart wallet",
  ];

  testMessages.forEach((message) => {
    const shouldCreate = walletCreationKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
    console.log(
      `Message: "${message}" -> Should create wallet: ${shouldCreate}`
    );
  });

  console.log("\n2. Testing cooldown logic...");

  // Simulate cooldown check
  const now = Date.now();
  const cooldown = 5000; // 5 seconds
  const lastCreation = now - 2000; // 2 seconds ago

  if (now - lastCreation < cooldown) {
    const remaining = Math.ceil((cooldown - (now - lastCreation)) / 1000);
    console.log(`Cooldown active: Please wait ${remaining} seconds`);
  } else {
    console.log("Cooldown passed: Can create wallet");
  }

  console.log("\n3. Testing existing wallet detection...");

  // Simulate existing wallet check
  const existingWallets = 2;
  const userMessage = "wallet";

  if (
    existingWallets > 0 &&
    userMessage.includes("wallet") &&
    !userMessage.includes("create") &&
    !userMessage.includes("new") &&
    !userMessage.includes("make")
  ) {
    console.log(
      `User has ${existingWallets} wallets and is asking about wallets in general`
    );
    console.log(
      "Should suggest showing existing wallets instead of creating new one"
    );
  } else {
    console.log("Should proceed with wallet creation");
  }

  console.log("\n✅ Wallet creation test completed!");
}

testWalletCreation().catch(console.error);









