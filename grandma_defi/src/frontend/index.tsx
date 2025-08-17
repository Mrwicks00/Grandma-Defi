import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import "./index.css";
import React, { useState, useEffect, useRef } from "react";
import type { UUID } from "@elizaos/core";

const queryClient = new QueryClient();

// Define the interface for the ELIZA_CONFIG
interface ElizaConfig {
  agentId: string;
  apiBase: string;
}

// Declare global window extension for TypeScript
declare global {
  interface Window {
    ELIZA_CONFIG?: ElizaConfig;
    ethereum?: any;
  }
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
  actions?: string[];
  data?: any;
}

interface WalletOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  command: string;
}

/**
 * Main Example route component
 */
function ExampleRoute() {
  const config = window.ELIZA_CONFIG;
  const agentId = config?.agentId;

  // Apply dark mode to the root element
  React.useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (!agentId) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 font-medium">
          Error: Agent ID not found
        </div>
        <div className="text-sm text-gray-600 mt-2">
          The server should inject the agent ID configuration.
        </div>
      </div>
    );
  }

  return <ChatInterface agentId={agentId as UUID} />;
}

/**
 * Chat interface component with wallet integration
 */
function ChatInterface({ agentId }: { agentId: UUID }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: '👋 Hello! I\'m your DeFi assistant. I can help you manage wallets, create portfolios, and navigate DeFi protocols. Type "connect wallet" to get started with MetaMask integration!',
      sender: "agent",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showWalletButtons, setShowWalletButtons] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for MetaMask
  const checkMetaMask = () => {
    return typeof window.ethereum !== "undefined";
  };

  // Connect to MetaMask
  const connectMetaMask = async () => {
    if (!checkMetaMask()) {
      addMessage(
        "❌ MetaMask not detected! Please install MetaMask extension first.",
        "agent"
      );
      return;
    }

    try {
      setIsLoading(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        addMessage(
          `🦊 MetaMask connected successfully!\n\n📍 Address: ${accounts[0]}\n\n✅ You can now use DeFi features with your MetaMask wallet!`,
          "agent"
        );
      }
    } catch (error: any) {
      addMessage(`❌ MetaMask connection failed: ${error.message}`, "agent");
    } finally {
      setIsLoading(false);
    }
  };

  // Add message to chat
  const addMessage = (
    text: string,
    sender: "user" | "agent",
    actions?: string[],
    data?: any
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
      actions,
      data,
    };
    setMessages((prev) => [...prev, newMessage]);

    // Check if this message should trigger wallet UI
    if (actions && actions.includes("WALLET_CONNECT_PROMPT")) {
      setShowWalletButtons(true);
    }
  };

  // Handle wallet action button clicks
  const handleWalletAction = (command: string) => {
    setInputValue(command);
    // Simulate typing the command
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // Add user message
    addMessage(userMessage, "user");

    try {
      // Simulate API call to ElizaOS
      const response = await fetch(
        `${window.ELIZA_CONFIG?.apiBase || "http://localhost:3000"}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
            agentId: agentId,
            userId: walletAddress || "anonymous",
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        addMessage(
          data.text || "Response received",
          "agent",
          data.actions,
          data.data
        );
      } else {
        // Fallback - simulate agent responses for demo
        simulateAgentResponse(userMessage);
      }
    } catch (error) {
      // Fallback - simulate agent responses for demo
      simulateAgentResponse(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate agent responses (fallback for demo)
  const simulateAgentResponse = (userMessage: string) => {
    const lowerMessage = userMessage.toLowerCase();

    if (
      lowerMessage.includes("connect wallet") ||
      lowerMessage.includes("metamask")
    ) {
      const walletOptions: WalletOption[] = [
        {
          id: "metamask",
          name: "Connect MetaMask",
          description: "Connect your existing MetaMask wallet",
          icon: "🦊",
          command: "connect metamask",
        },
        {
          id: "smart_account",
          name: "Create Smart Account",
          description: "Create a new gasless smart wallet",
          icon: "🆕",
          command: "create wallet",
        },
        {
          id: "check_balance",
          name: "Check Balances",
          description: "View token balances",
          icon: "💰",
          command: "check my token balances",
        },
        {
          id: "view_portfolios",
          name: "View Portfolios",
          description: "See your DeFi investments",
          icon: "📊",
          command: "get my portfolios",
        },
      ];

      addMessage(
        `🔗 **MetaMask Wallet Connection**\n\nConnect your existing MetaMask wallet to access DeFi features!\n\n🚀 Choose your preferred option below to get started!`,
        "agent",
        ["WALLET_CONNECT_PROMPT"],
        { walletOptions }
      );
    } else if (lowerMessage.includes("connect metamask")) {
      connectMetaMask();
    } else {
      addMessage(
        `I received your message: "${userMessage}". This is a demo response. The actual ElizaOS agent will provide more sophisticated responses!`,
        "agent"
      );
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                👵
              </div>
              <div>
                <h1 className="text-lg font-semibold">
                  Grandma DeFi Assistant
                </h1>
                <p className="text-sm text-gray-400">Agent ID: {agentId}</p>
              </div>
            </div>
            {walletConnected && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-400">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-100"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.text}</div>

                {/* Wallet connection buttons */}
                {message.actions?.includes("WALLET_CONNECT_PROMPT") &&
                  message.data?.walletOptions && (
                    <div className="mt-4 space-y-2">
                      {message.data.walletOptions.map(
                        (option: WalletOption) => (
                          <button
                            key={option.id}
                            onClick={() => handleWalletAction(option.command)}
                            className="w-full p-3 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors text-left"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{option.icon}</span>
                              <div>
                                <div className="font-medium">{option.name}</div>
                                <div className="text-sm text-gray-300">
                                  {option.description}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      )}
                    </div>
                  )}

                <div className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message... (try 'connect wallet')"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

// Initialize the application - no router needed for iframe
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<ExampleRoute />);
}

// Define types for integration with agent UI system
export interface AgentPanel {
  name: string;
  path: string;
  component: React.ComponentType<any>;
  icon?: string;
  public?: boolean;
  shortLabel?: string; // Optional short label for mobile
}

interface PanelProps {
  agentId: string;
}

/**
 * Example panel component for the plugin system
 */
const PanelComponent: React.FC<PanelProps> = ({ agentId }) => {
  return <div>Helllo {agentId}!</div>;
};

// Export the panel configuration for integration with the agent UI
export const panels: AgentPanel[] = [
  {
    name: "Example",
    path: "example",
    component: PanelComponent,
    icon: "Book",
    public: false,
    shortLabel: "Example",
  },
];

export * from "./utils";
