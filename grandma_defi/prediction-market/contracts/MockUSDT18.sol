// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT18
 * @dev Mock Tether USD with 18 decimals for AMM compatibility
 */
contract MockUSDT18 is ERC20, Ownable {
    constructor() ERC20("Tether USD 18", "USDT18") Ownable(msg.sender) {
        _mint(msg.sender, 10000000 * 10 ** 18); // 10M USDT18 with 18 decimals
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucet() external {
        require(balanceOf(msg.sender) == 0, "Already claimed");
        _mint(msg.sender, 10000 * 10 ** 18); // 10,000 USDT18 per claim
    }
}

















