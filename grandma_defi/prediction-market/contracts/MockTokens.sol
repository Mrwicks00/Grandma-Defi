// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockWETH 
 * @dev Mock Wrapped Ethereum for testing
 */
contract MockWETH is ERC20, Ownable {
    constructor() ERC20("Wrapped Ethereum", "wETH") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**18); // 1M initial supply
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function faucet() external {
        require(balanceOf(msg.sender) == 0, "Already claimed");
        _mint(msg.sender, 100 * 10**18); // 100 wETH per claim
    }
}

/**
 * @title MockWBTC
 * @dev Mock Wrapped Bitcoin for testing  
 */
contract MockWBTC is ERC20, Ownable {
    constructor() ERC20("Wrapped Bitcoin", "wBTC") Ownable(msg.sender) {
        _mint(msg.sender, 100000 * 10**8); // 100K wBTC with 8 decimals
    }
    
    function decimals() public pure override returns (uint8) {
        return 8; // Bitcoin uses 8 decimals
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function faucet() external {
        require(balanceOf(msg.sender) == 0, "Already claimed");
        _mint(msg.sender, 5 * 10**8); // 5 wBTC per claim
    }
}

/**
 * @title MockUSDT
 * @dev Mock Tether USD for testing
 */
contract MockUSDT is ERC20, Ownable {
    constructor() ERC20("Tether USD", "USDT") Ownable(msg.sender) {
        _mint(msg.sender, 10000000 * 10**6); // 10M USDT with 6 decimals
    }
    
    function decimals() public pure override returns (uint8) {
        return 6; // USDT uses 6 decimals
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function faucet() external {
        require(balanceOf(msg.sender) == 0, "Already claimed");
        _mint(msg.sender, 10000 * 10**6); // 10,000 USDT per claim
    }
}

/**
 * @title GrandmaToken
 * @dev Custom governance token for the portfolio system
 */
contract GrandmaToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1B max supply
    mapping(address => bool) public hasClaimed;
    
    constructor() ERC20("Grandma DeFi Token", "GRANDMA") Ownable(msg.sender) {
        _mint(msg.sender, 100000000 * 10**18); // 100M to owner
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
    
    function faucet() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, 1000 * 10**18); // 1,000 GRANDMA per claim
    }
    
    // Reward function for portfolio creators
    function rewardPortfolioCreator(address creator, uint256 portfolioValue) external onlyOwner {
        require(totalSupply() <= MAX_SUPPLY, "Max supply reached");
        
        // Reward based on portfolio value (1 GRANDMA per 1000 USD portfolio value)
        uint256 rewardAmount = (portfolioValue * 10**18) / (1000 * 10**8); // Convert USD to GRANDMA
        
        if (totalSupply() + rewardAmount <= MAX_SUPPLY) {
            _mint(creator, rewardAmount);
        }
    }
}

/**
 * @title TokenFactory
 * @dev Factory to deploy all mock tokens at once
 */
contract TokenFactory is Ownable {
    MockWETH public wETH;
    MockWBTC public wBTC; 
    MockUSDT public usdt;
    GrandmaToken public grandma;
    
    event TokensDeployed(address wETH, address wBTC, address usdt, address grandma);
    
    constructor() Ownable(msg.sender) {
        deployTokens();
    }
    
    function deployTokens() public onlyOwner {
        wETH = new MockWETH();
        wBTC = new MockWBTC();
        usdt = new MockUSDT();
        grandma = new GrandmaToken();
        
        emit TokensDeployed(address(wETH), address(wBTC), address(usdt), address(grandma));
    }
    
    function getTokenAddresses() external view returns (
        address wETHAddress,
        address wBTCAddress, 
        address usdtAddress,
        address grandmaAddress
    ) {
        return (address(wETH), address(wBTC), address(usdt), address(grandma));
    }
    
    // Mass faucet function for testing
    function claimAllTokens(address user) external onlyOwner {
        wETH.mint(user, 100 * 10**18);
        wBTC.mint(user, 5 * 10**8);
        usdt.mint(user, 10000 * 10**6);
        grandma.mint(user, 1000 * 10**18);
    }
    
    // Transfer ownership of all tokens
    function transferTokenOwnership(address newOwner) external onlyOwner {
        wETH.transferOwnership(newOwner);
        wBTC.transferOwnership(newOwner);
        usdt.transferOwnership(newOwner);
        grandma.transferOwnership(newOwner);
    }
}