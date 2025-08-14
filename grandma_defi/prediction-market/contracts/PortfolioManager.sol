// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
// REMOVED: import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PortfolioManager
 * @dev AI-Powered DeFi Portfolio Manager with Dynamic Scheduling
 */
contract PortfolioManager is Ownable, ReentrancyGuard {
    // REMOVED: AutomationCompatibleInterface from inheritance
    using SafeERC20 for IERC20;
    
    // Constants
    uint256 public constant MNT_ADDRESS = 0; // Use 0 for native MNT
    uint256 public constant BASIS_POINTS = 10000; // 100%
    uint256 public constant MIN_PORTFOLIO_VALUE = 0.01 ether; // Minimum 0.01 MNT
    
    // Structs - KEEPING ALL YOUR STRUCTS
    struct Portfolio {
        address owner;
        mapping(address => uint256) targetAllocations; // token => percentage in basis points
        mapping(address => uint256) currentBalances;   // token => amount
        address[] tokens;
        uint256 totalValueUSD; // in USD (scaled by 1e8)
        bool active;
        uint256 lastRebalance;
        uint256 rebalanceThreshold; // deviation threshold in basis points
        bool autoRebalance;
        uint256 createdAt;
    }
    
    struct ScheduledAction {
        uint256 portfolioId;
        ActionType actionType;
        uint256 executeTime;
        mapping(address => uint256) targetAllocations; // for rebalance actions
        address[] tokens;
        int256 priceCondition; // price threshold (0 if no condition)
        address conditionToken; // token to check price condition
        int256 percentageCondition; // percentage drop/gain threshold (0 if no condition)
        bool executed;
        bool active;
        string description;
    }
    
    struct TokenTracking {
        uint256 entryPrice;          // Price when position was first opened
        uint256 peakPrice;           // Highest price seen since entry
        uint256 peakTimestamp;       // When peak occurred
        uint256 lastUpdateTime;      // Last price update
        uint256 entryTimestamp;      // When position started
    }
    
    struct Position {
        uint256 amount;              // Token amount
        uint256 entryPrice;          // Average entry price
        uint256 totalInvested;       // Total USD invested in this position
        uint256 entryTimestamp;      // When position was opened
    }
    
    struct LiquidityPool {
        uint256 mntReserve;
        uint256 tokenReserve;
        uint256 totalShares;
        mapping(address => uint256) userShares;
    }
    
    enum ActionType {
        REBALANCE,
        DCA,
        STOP_LOSS,
        TAKE_PROFIT
    }
    
    enum ConditionType {
        NONE,
        PRICE_ABOVE,
        PRICE_BELOW,
        TIME_BASED,
        PORTFOLIO_VALUE_CHANGE
    }
    
    // State variables - KEEPING ALL YOUR STATE
    uint256 public nextPortfolioId = 1;
    uint256 public nextActionId = 1;
    uint256 public managementFee = 100; // 1% annual in basis points
    
    mapping(uint256 => Portfolio) public portfolios;
    mapping(address => uint256[]) public userPortfolios;
    mapping(uint256 => ScheduledAction) public scheduledActions;
    mapping(address => address) public priceFeeds; // token => Chainlink price feed - KEEPING THIS!
    mapping(address => LiquidityPool) public liquidityPools; // token => pool with MNT
    mapping(uint256 => mapping(address => TokenTracking)) public tokenTracking; // portfolioId => token => tracking
    mapping(uint256 => mapping(address => Position)) public positions; // portfolioId => token => position
    
    // Supported tokens
    address[] public supportedTokens;
    mapping(address => bool) public isTokenSupported;
    
    uint256[] public activePortfolios;
    uint256[] public pendingActions;
    
    // Events - KEEPING ALL YOUR EVENTS
    event PortfolioCreated(
        uint256 indexed portfolioId,
        address indexed owner,
        address[] tokens,
        uint256[] allocations
    );
    
    event ActionScheduled(
        uint256 indexed actionId,
        uint256 indexed portfolioId,
        ActionType actionType,
        uint256 executeTime,
        string description
    );
    
    event PortfolioRebalanced(
        uint256 indexed portfolioId,
        uint256 oldValueUSD,
        uint256 newValueUSD,
        address[] tokens,
        uint256[] newBalances
    );
    
    event ActionExecuted(
        uint256 indexed actionId,
        uint256 indexed portfolioId,
        bool success
    );
    
    event LiquidityAdded(
        address indexed token,
        uint256 mntAmount,
        uint256 tokenAmount,
        address indexed provider
    );
    
    // Modifiers - KEEPING ALL YOUR MODIFIERS
    modifier onlyPortfolioOwner(uint256 _portfolioId) {
        require(portfolios[_portfolioId].owner == msg.sender, "Not portfolio owner");
        _;
    }
    
    modifier portfolioExists(uint256 _portfolioId) {
        require(_portfolioId < nextPortfolioId && _portfolioId > 0, "Portfolio does not exist");
        _;
    }
    
    modifier onlySupported(address _token) {
        require(_token == address(0) || isTokenSupported[_token], "Token not supported");
        _;
    }
    
    constructor(
        address[] memory _supportedTokens,
        address[] memory _priceFeeds
    ) Ownable(msg.sender) {
        require(_supportedTokens.length == _priceFeeds.length, "Array length mismatch");
        
        // Set up supported tokens and their price feeds
        for (uint256 i = 0; i < _supportedTokens.length; i++) {
            supportedTokens.push(_supportedTokens[i]);
            isTokenSupported[_supportedTokens[i]] = true;
            priceFeeds[_supportedTokens[i]] = _priceFeeds[i];
        }
        
        // MNT is always supported (native token)op
        isTokenSupported[address(0)] = true;
    }
    
    /**
     * @dev Create a new portfolio - KEEPING THIS FUNCTION!
     */
    function createPortfolio(
        address[] memory _tokens,
        uint256[] memory _allocations,
        uint256 _rebalanceThreshold
    ) external payable returns (uint256) {
        require(_tokens.length == _allocations.length, "Array length mismatch");
        require(_tokens.length > 0 && _tokens.length <= 10, "Invalid token count");
        require(msg.value >= MIN_PORTFOLIO_VALUE, "Insufficient initial value");
        
        // Validate allocations sum to 100%
        uint256 totalAllocation = 0;
        bool hasMNT = false;
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(isTokenSupported[_tokens[i]], "Token not supported");
            require(_allocations[i] > 0, "Allocation must be positive");
            totalAllocation += _allocations[i];
            
            if (_tokens[i] == address(0)) {
                hasMNT = true;
            }
        }
        
        require(totalAllocation == BASIS_POINTS, "Allocations must sum to 100%");
        require(hasMNT, "Portfolio must include MNT");
        
        uint256 portfolioId = nextPortfolioId++;
        Portfolio storage newPortfolio = portfolios[portfolioId];
        
        newPortfolio.owner = msg.sender;
        newPortfolio.active = true;
        newPortfolio.lastRebalance = block.timestamp;
        newPortfolio.rebalanceThreshold = _rebalanceThreshold;
        newPortfolio.autoRebalance = false;
        newPortfolio.createdAt = block.timestamp;
        
        // Set up token allocations and initialize tracking
        for (uint256 i = 0; i < _tokens.length; i++) {
            newPortfolio.tokens.push(_tokens[i]);
            newPortfolio.targetAllocations[_tokens[i]] = _allocations[i];
            
            // Initialize price tracking for each token
            _initializeTokenTracking(portfolioId, _tokens[i]);
        }
        
        // Initial deposit (all MNT, will be rebalanced)
        newPortfolio.currentBalances[address(0)] = msg.value;
        
        // Add to tracking arrays
        userPortfolios[msg.sender].push(portfolioId);
        activePortfolios.push(portfolioId);
        
        emit PortfolioCreated(portfolioId, msg.sender, _tokens, _allocations);
        
        // Perform initial rebalancing
        _performRebalance(portfolioId);
        
        return portfolioId;
    }
    
    /**
     * @dev Schedule an action with optional price/percentage condition
     */
    function scheduleAction(
        uint256 _portfolioId,
        ActionType _actionType,
        uint256 _executeTime,
        address[] memory _tokens,
        uint256[] memory _allocations,
        address _conditionToken,
        int256 _priceCondition,
        int256 _percentageCondition,
        string memory _description
    ) external onlyPortfolioOwner(_portfolioId) portfolioExists(_portfolioId) returns (uint256) {
        require(_executeTime > block.timestamp, "Execute time must be in future");
        
        if (_actionType == ActionType.REBALANCE) {
            require(_tokens.length == _allocations.length, "Array length mismatch");
            uint256 totalAllocation = 0;
            for (uint256 i = 0; i < _allocations.length; i++) {
                totalAllocation += _allocations[i];
            }
            require(totalAllocation == BASIS_POINTS, "Allocations must sum to 100%");
        }
        
        uint256 actionId = nextActionId++;
        ScheduledAction storage action = scheduledActions[actionId];
        
        action.portfolioId = _portfolioId;
        action.actionType = _actionType;
        action.executeTime = _executeTime;
        action.priceCondition = _priceCondition;
        action.percentageCondition = _percentageCondition;
        action.conditionToken = _conditionToken;
        action.executed = false;
        action.active = true;
        action.description = _description;
        
        // Set target allocations for rebalance actions
        if (_actionType == ActionType.REBALANCE) {
            action.tokens = _tokens;
            for (uint256 i = 0; i < _tokens.length; i++) {
                action.targetAllocations[_tokens[i]] = _allocations[i];
            }
        }
        
        pendingActions.push(actionId);
        
        emit ActionScheduled(actionId, _portfolioId, _actionType, _executeTime, _description);
        return actionId;
    }
    
    /**
     * @dev Get token price from Chainlink - KEEPING THIS!
     */
    function getTokenPrice(address _token) public view returns (int256) {
        address feed;
        int256 price;
        
        if (_token == address(0)) {
            // For MNT, we'll use a mainnet MNT/USD feed
            feed = priceFeeds[address(0)];
            require(feed != address(0), "MNT price feed not set");
            
            (, price, , , ) = AggregatorV3Interface(feed).latestRoundData();
            return price;
        }
        
        feed = priceFeeds[_token];
        require(feed != address(0), "Price feed not available");
        
        (, price, , , ) = AggregatorV3Interface(feed).latestRoundData();
        return price;
    }
    
    // REPLACED: checkUpkeep with manual function
    /**
     * @dev Manual check for ready actions (replaces Chainlink checkUpkeep)
     */
    function getReadyActions() external view returns (uint256[] memory readyActionIds) {
        uint256[] memory readyActions = new uint256[](pendingActions.length);
        uint256 readyCount = 0;
        
        for (uint256 i = 0; i < pendingActions.length; i++) {
            uint256 actionId = pendingActions[i];
            ScheduledAction storage action = scheduledActions[actionId];
            
            if (!action.active || action.executed) continue;
            
            bool timeConditionMet = block.timestamp >= action.executeTime;
            bool priceConditionMet = true;
            bool percentageConditionMet = true;
            
            // Check price condition if set
            if (action.priceCondition != 0) {
                int256 currentPrice = getTokenPrice(action.conditionToken);
                priceConditionMet = currentPrice >= action.priceCondition;
            }
            
            // Check percentage condition if set
            if (action.percentageCondition != 0) {
                int256 percentChange = this.getRealTimeDropFromPeak(action.portfolioId, action.conditionToken);
                
                if (action.percentageCondition < 0) {
                    // Stop-loss condition
                    percentageConditionMet = percentChange <= action.percentageCondition;
                } else {
                    // Take-profit condition
                    percentageConditionMet = percentChange >= action.percentageCondition;
                }
            }
            
            if (timeConditionMet && priceConditionMet && percentageConditionMet) {
                readyActions[readyCount] = actionId;
                readyCount++;
            }
        }
        
        // Resize array to actual size
        readyActionIds = new uint256[](readyCount);
        for (uint256 i = 0; i < readyCount; i++) {
            readyActionIds[i] = readyActions[i];
        }
    }
    
    // REPLACED: performUpkeep with manual function
    /**
     * @dev Execute ready actions manually (replaces Chainlink performUpkeep)
     */
    function executeReadyActions() external nonReentrant {
        uint256[] memory readyActions = this.getReadyActions();
        require(readyActions.length > 0, "No actions ready for execution");
        
        // Update all relevant peaks before executing actions
        _updateRelevantPeaks(readyActions);
        
        // Then execute actions
        for (uint256 i = 0; i < readyActions.length; i++) {
            _executeAction(readyActions[i]);
        }
    }
    
    // KEEPING ALL YOUR OTHER FUNCTIONS EXACTLY AS THEY ARE:
    
    /**
     * @dev Update peak price tracking for a token
     */
    function updatePeakPrice(uint256 _portfolioId, address _token) internal {
        int256 currentPrice = getTokenPrice(_token);
        require(currentPrice > 0, "Invalid price");
        
        TokenTracking storage tracking = tokenTracking[_portfolioId][_token];
        
        // Initialize if first time
        if (tracking.entryPrice == 0) {
            tracking.entryPrice = uint256(currentPrice);
            tracking.peakPrice = uint256(currentPrice);
            tracking.entryTimestamp = block.timestamp;
        }
        
        // Update peak if current price is higher
        if (uint256(currentPrice) > tracking.peakPrice) {
            tracking.peakPrice = uint256(currentPrice);
            tracking.peakTimestamp = block.timestamp;
        }
        
        tracking.lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev Calculate percentage drop from peak price
     */
    function calculateDropFromPeak(uint256 _portfolioId, address _token) public view returns (int256) {
        TokenTracking memory tracking = tokenTracking[_portfolioId][_token];
        int256 currentPrice = getTokenPrice(_token);
        
        if (tracking.peakPrice == 0 || currentPrice <= 0) return 0;
        
        // Calculate percentage change: ((current - peak) / peak) * 10000 (basis points)
        int256 priceDiff = currentPrice - int256(tracking.peakPrice);
        int256 percentChange = (priceDiff * 10000) / int256(tracking.peakPrice);
        
        return percentChange; // Negative = drop, Positive = gain
    }
    
    /**
     * @dev Calculate percentage change from entry price
     */
    function calculateChangeFromEntry(uint256 _portfolioId, address _token) public view returns (int256) {
        TokenTracking memory tracking = tokenTracking[_portfolioId][_token];
        int256 currentPrice = getTokenPrice(_token);
        
        if (tracking.entryPrice == 0 || currentPrice <= 0) return 0;
        
        // Calculate percentage change: ((current - entry) / entry) * 10000
        int256 priceDiff = currentPrice - int256(tracking.entryPrice);
        int256 percentChange = (priceDiff * 10000) / int256(tracking.entryPrice);
        
        return percentChange; // Negative = loss, Positive = gain
    }
    
    /**
     * @dev Calculate portfolio-wide percentage change
     */
    function calculatePortfolioChange(uint256 _portfolioId) public view returns (int256) {
        Portfolio storage portfolio = portfolios[_portfolioId];
        
        uint256 currentValue = _calculatePortfolioValue(_portfolioId);
        uint256 initialValue = 0;
        
        // Calculate initial portfolio value based on entry prices
        for (uint256 i = 0; i < portfolio.tokens.length; i++) {
            address token = portfolio.tokens[i];
            uint256 balance = portfolio.currentBalances[token];
            TokenTracking memory tracking = tokenTracking[_portfolioId][token];
            
            if (balance > 0 && tracking.entryPrice > 0) {
                uint256 tokenInitialValue;
                if (token == address(0)) {
                    // For MNT
                    tokenInitialValue = (balance * tracking.entryPrice) / 1e18;
                } else {
                    // For ERC20 tokens
                    tokenInitialValue = (balance * tracking.entryPrice) / 1e18;
                }
                initialValue += tokenInitialValue;
            }
        }
        
        if (initialValue == 0) return 0;
        
        // Calculate portfolio percentage change
        int256 valueDiff = int256(currentValue) - int256(initialValue);
        int256 percentChange = (valueDiff * 10000) / int256(initialValue);
        return percentChange; 
    }

    /**
     * @dev Update peaks for all tokens involved in the actions about to execute
     */
    function _updateRelevantPeaks(uint256[] memory actionIds) internal {
        for (uint256 i = 0; i < actionIds.length; i++) {
            ScheduledAction storage action = scheduledActions[actionIds[i]];
            
            if (!action.active || action.executed) continue;
            
            // Update peak for condition token if percentage condition is set
            if (action.percentageCondition != 0 && action.conditionToken != address(0)) {
                _updatePeakPrice(action.portfolioId, action.conditionToken);
            }
            
            // Also update peaks for all tokens in the portfolio being acted upon
            Portfolio storage portfolio = portfolios[action.portfolioId];
            for (uint256 j = 0; j < portfolio.tokens.length; j++) {
                _updatePeakPrice(action.portfolioId, portfolio.tokens[j]);
            }
        }
    }

    /**
     * @dev Internal function to update peak price (non-view version)
     */
    function _updatePeakPrice(uint256 _portfolioId, address _token) internal {
        int256 currentPrice = getTokenPrice(_token);
        require(currentPrice > 0, "Invalid price");
        
        TokenTracking storage tracking = tokenTracking[_portfolioId][_token];
        
        // Initialize if first time
        if (tracking.entryPrice == 0) {
            tracking.entryPrice = uint256(currentPrice);
            tracking.peakPrice = uint256(currentPrice);
            tracking.entryTimestamp = block.timestamp;
        }
        
        // Update peak if current price is higher
        if (uint256(currentPrice) > tracking.peakPrice) {
            tracking.peakPrice = uint256(currentPrice);
            tracking.peakTimestamp = block.timestamp;
        }
        
        tracking.lastUpdateTime = block.timestamp;
    }

    /**
     * @dev Manual function to update all peaks for a portfolio
     */
    function updateAllPeaks(uint256 _portfolioId) external {
        require(_portfolioId < nextPortfolioId && _portfolioId > 0, "Portfolio does not exist");
        
        Portfolio storage portfolio = portfolios[_portfolioId];
        for (uint256 i = 0; i < portfolio.tokens.length; i++) {
            _updatePeakPrice(_portfolioId, portfolio.tokens[i]);
        }
    }

    /**
     * @dev Get real-time drop calculation (accounts for potential new peaks)
     */
    function getRealTimeDropFromPeak(uint256 _portfolioId, address _token) external view returns (int256) {
        TokenTracking memory tracking = tokenTracking[_portfolioId][_token];
        int256 currentPrice = getTokenPrice(_token);
        
        if (currentPrice <= 0) return 0;
        
        // Use the higher of stored peak or current price
        uint256 effectivePeak = tracking.peakPrice;
        if (uint256(currentPrice) > tracking.peakPrice) {
            effectivePeak = uint256(currentPrice);
        }
        
        if (effectivePeak == 0) return 0;
        
        // Calculate percentage change: ((current - peak) / peak) * 10000
        int256 priceDiff = currentPrice - int256(effectivePeak);
        int256 percentChange = (priceDiff * 10000) / int256(effectivePeak);
        
        return percentChange; // Negative = drop, Positive = gain
    }
    
    /**
     * @dev Execute a specific action
     */
    function _executeAction(uint256 _actionId) internal {
        ScheduledAction storage action = scheduledActions[_actionId];
        
        if (!action.active || action.executed) return;
        
        bool success = false;
        
        if (action.actionType == ActionType.REBALANCE) {
            success = _executeRebalanceAction(_actionId);
        }
        // Add other action types as needed
        
        action.executed = true;
        action.active = false;
        
        emit ActionExecuted(_actionId, action.portfolioId, success);
    }
    
    /**
     * @dev Execute rebalance action
     */
    function _executeRebalanceAction(uint256 _actionId) internal returns (bool) {
        ScheduledAction storage action = scheduledActions[_actionId];
        Portfolio storage portfolio = portfolios[action.portfolioId];
        
        // Update target allocations
        for (uint256 i = 0; i < action.tokens.length; i++) {
            address token = action.tokens[i];
            portfolio.targetAllocations[token] = action.targetAllocations[token];
        }
        
        return _performRebalance(action.portfolioId);
    }
    
    /**
     * @dev Perform portfolio rebalancing
     */
    function _performRebalance(uint256 _portfolioId) internal returns (bool) {
        Portfolio storage portfolio = portfolios[_portfolioId];
        
        // Calculate current portfolio value in USD
        uint256 totalValueUSD = _calculatePortfolioValue(_portfolioId);
        require(totalValueUSD > 0, "Portfolio has no value");
        
        // For each token, calculate target balance and perform swaps
        for (uint256 i = 0; i < portfolio.tokens.length; i++) {
            address token = portfolio.tokens[i];
            uint256 targetAllocation = portfolio.targetAllocations[token];
            
            // Skip if no allocation for this token
            if (targetAllocation == 0) continue;
            
            // Calculate target value for this token
            uint256 targetValueUSD = (totalValueUSD * targetAllocation) / BASIS_POINTS;
            
            // Convert USD value to token amount
            int256 tokenPrice = getTokenPrice(token);
            require(tokenPrice > 0, "Invalid token price");
            
            uint256 targetBalance;
            if (token == address(0)) {
                // For MNT, price is in USD with 8 decimals, we want MNT with 18 decimals
                // Avoid overflow by checking if values are reasonable
                require(targetValueUSD < type(uint256).max / 1e18, "Value too large");
                targetBalance = (targetValueUSD * 1e18) / uint256(tokenPrice);
            } else {
                // For ERC20 tokens, assume 18 decimals
                require(targetValueUSD < type(uint256).max / 1e18, "Value too large");
                targetBalance = (targetValueUSD * 1e18) / uint256(tokenPrice);
            }
            
            uint256 currentBalance = portfolio.currentBalances[token];
            
            // Only rebalance if difference is significant (>1% of target)
            uint256 tolerance = targetBalance / 100; // 1% tolerance
            
            if (targetBalance > currentBalance + tolerance) {
                // Need to buy more of this token
                uint256 amountToBuy = targetBalance - currentBalance;
                
                // Try the swap, but don't fail the entire rebalance if one swap fails
                try this.swapToTokenWrapper(_portfolioId, token, amountToBuy) {
                    // Swap succeeded
                } catch {
                    // Swap failed, continue with other tokens
                    continue;
                }
            } else if (currentBalance > targetBalance + tolerance) {
                // Need to sell some of this token
                uint256 amountToSell = currentBalance - targetBalance;
                
                // Try the swap, but don't fail the entire rebalance if one swap fails
                try this.swapFromTokenWrapper(_portfolioId, token, amountToSell) {
                    // Swap succeeded
                } catch {
                    // Swap failed, continue with other tokens
                    continue;
                }
            }
        }
        
        portfolio.lastRebalance = block.timestamp;
        portfolio.totalValueUSD = _calculatePortfolioValue(_portfolioId); // Recalculate after swaps
        
        // Update peak prices after rebalancing
        for (uint256 i = 0; i < portfolio.tokens.length; i++) {
            updatePeakPrice(_portfolioId, portfolio.tokens[i]);
        }
        
        // Get final balances for event
        uint256[] memory newBalances = new uint256[](portfolio.tokens.length);
        for (uint256 i = 0; i < portfolio.tokens.length; i++) {
            newBalances[i] = portfolio.currentBalances[portfolio.tokens[i]];
        }
        
        emit PortfolioRebalanced(_portfolioId, totalValueUSD, portfolio.totalValueUSD, portfolio.tokens, newBalances);
        
        return true;
    }
    
    /**
     * @dev Calculate total portfolio value in USD
     */
    function _calculatePortfolioValue(uint256 _portfolioId) internal view returns (uint256) {
        Portfolio storage portfolio = portfolios[_portfolioId];
        uint256 totalValueUSD = 0;
        
        for (uint256 i = 0; i < portfolio.tokens.length; i++) {
            address token = portfolio.tokens[i];
            uint256 balance = portfolio.currentBalances[token];
            
            if (balance > 0) {
                int256 price = getTokenPrice(token);
                if (price > 0) {
                    // Convert token balance to USD (assuming 18 decimals for tokens, 8 for price)
                    uint256 valueUSD = (balance * uint256(price)) / 1e18;
                    totalValueUSD += valueUSD;
                }
            }
        }
        
        return totalValueUSD;
    }
    
    /**
     * @dev Simple AMM swap to buy token with MNT
     */
    function _swapToToken(uint256 _portfolioId, address _token, uint256 _targetAmount) internal {
        if (_token == address(0)) return; // Already MNT
        
        Portfolio storage portfolio = portfolios[_portfolioId];
        LiquidityPool storage pool = liquidityPools[_token];
        
        require(pool.tokenReserve > 0, "No liquidity for token");
        require(pool.mntReserve > 0, "No MNT liquidity");
        
        // Safety check: Can't buy more than 90% of available tokens
        uint256 maxBuyable = (pool.tokenReserve * 9) / 10;
        if (_targetAmount > maxBuyable) {
            _targetAmount = maxBuyable;
        }
        
        // Constant product formula: (x + dx) * (y - dy) = x * y
        // Solving for dx (MNT needed): dx = (x * dy) / (y - dy)
        uint256 mntNeeded;
        
        // Additional safety: ensure tokenReserve > _targetAmount to avoid underflow
        if (pool.tokenReserve <= _targetAmount) {
            // Fallback: use 90% of available tokens
            _targetAmount = (pool.tokenReserve * 9) / 10;
        }
        
        // Safe calculation with overflow protection
        uint256 numerator = pool.mntReserve * _targetAmount;
        uint256 denominator = pool.tokenReserve - _targetAmount;
        
        require(denominator > 0, "Invalid swap calculation");
        mntNeeded = numerator / denominator;
        
        // Add 0.3% trading fee
        mntNeeded = (mntNeeded * 1003) / 1000;
        
        require(portfolio.currentBalances[address(0)] >= mntNeeded, "Insufficient MNT");
        
        // Update balances
        portfolio.currentBalances[address(0)] -= mntNeeded;
        portfolio.currentBalances[_token] += _targetAmount;
        
        // Update pool reserves
        pool.mntReserve += mntNeeded;
        pool.tokenReserve -= _targetAmount;
        
        // Sanity check: reserves should never be zero after swap
        require(pool.mntReserve > 0 && pool.tokenReserve > 0, "Pool reserves corrupted");
    }
    
    /**
     * @dev Simple AMM swap to sell token for MNT
     */
    function _swapFromToken(uint256 _portfolioId, address _token, uint256 _amountToSell) internal {
        if (_token == address(0)) return; // Already MNT
        
        Portfolio storage portfolio = portfolios[_portfolioId];
        LiquidityPool storage pool = liquidityPools[_token];
        
        require(portfolio.currentBalances[_token] >= _amountToSell, "Insufficient token balance");
        require(pool.mntReserve > 0 && pool.tokenReserve > 0, "No liquidity for token");
        
        // Safety check: Can't sell more than what would drain 90% of MNT liquidity
        uint256 maxMntOut = (pool.mntReserve * 9) / 10;
        
        // Calculate MNT to receive using constant product formula
        // (x + dx) * (y - dy) = x * y
        // Solving for dy (MNT received): dy = (y * dx) / (x + dx)
        uint256 numerator = pool.mntReserve * _amountToSell;
        uint256 denominator = pool.tokenReserve + _amountToSell;
        
        require(denominator > 0, "Invalid swap calculation");
        uint256 mntReceived = numerator / denominator;
        
        // Safety check: don't drain too much MNT
        if (mntReceived > maxMntOut) {
            mntReceived = maxMntOut;
            // Recalculate how many tokens we actually need to sell
            // dx = (x * dy) / (y - dy)
            uint256 actualTokensToSell = (pool.tokenReserve * mntReceived) / (pool.mntReserve - mntReceived);
            _amountToSell = actualTokensToSell;
        }
        
        // Apply 0.3% trading fee (reduce MNT received)
        mntReceived = (mntReceived * 997) / 1000;
        
        // Update balances
        portfolio.currentBalances[_token] -= _amountToSell;
        portfolio.currentBalances[address(0)] += mntReceived;
        
        // Update pool reserves
        pool.tokenReserve += _amountToSell;
        pool.mntReserve -= mntReceived;
        
        // Sanity check: reserves should never be zero after swap
        require(pool.mntReserve > 0 && pool.tokenReserve > 0, "Pool reserves corrupted");
    }

    /**
     * @dev External wrapper for _swapToToken (for try/catch) - RENAMED!
     */
    function swapToTokenWrapper(uint256 _portfolioId, address _token, uint256 _targetAmount) external {
        require(msg.sender == address(this), "Internal function only");
        _swapToToken(_portfolioId, _token, _targetAmount);
    }

    /**
     * @dev External wrapper for _swapFromToken (for try/catch) - RENAMED!
     */
    function swapFromTokenWrapper(uint256 _portfolioId, address _token, uint256 _amountToSell) external {
        require(msg.sender == address(this), "Internal function only");
        _swapFromToken(_portfolioId, _token, _amountToSell);
    }
    
    /**
     * @dev Add liquidity to a token pool (for initial setup)
     */
    function addLiquidity(address _token, uint256 _tokenAmount) external payable onlyOwner {
        require(_token != address(0), "Cannot add liquidity to MNT pool");
        require(msg.value > 0 && _tokenAmount > 0, "Amounts must be positive");
        
        LiquidityPool storage pool = liquidityPools[_token];
        
        IERC20(_token).transferFrom(msg.sender, address(this), _tokenAmount);
        
        pool.mntReserve += msg.value;
        pool.tokenReserve += _tokenAmount;
        
        emit LiquidityAdded(_token, msg.value, _tokenAmount, msg.sender);
    }
    
    /**
     * @dev Initialize token tracking when first added to portfolio
     */
    function _initializeTokenTracking(uint256 _portfolioId, address _token) internal {
        int256 currentPrice = getTokenPrice(_token);
        require(currentPrice > 0, "Invalid token price");
        
        TokenTracking storage tracking = tokenTracking[_portfolioId][_token];
        tracking.entryPrice = uint256(currentPrice);
        tracking.peakPrice = uint256(currentPrice);
        tracking.entryTimestamp = block.timestamp;
        tracking.peakTimestamp = block.timestamp;
        tracking.lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev Manual rebalance trigger
     */
    function rebalanceNow(uint256 _portfolioId) external onlyPortfolioOwner(_portfolioId) {
        require(_performRebalance(_portfolioId), "Rebalance failed");
    }
    
    // View functions - KEEPING ALL YOUR VIEW FUNCTIONS
    function getPortfolio(uint256 _portfolioId) external view returns (
        address owner,
        address[] memory tokens,
        uint256[] memory targetAllocations,
        uint256[] memory currentBalances,
        uint256 totalValueUSD,
        bool active
    ) {
        Portfolio storage portfolio = portfolios[_portfolioId];
        
        tokens = portfolio.tokens;
        targetAllocations = new uint256[](tokens.length);
        currentBalances = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            targetAllocations[i] = portfolio.targetAllocations[tokens[i]];
            currentBalances[i] = portfolio.currentBalances[tokens[i]];
        }
        
        return (
            portfolio.owner,
            tokens,
            targetAllocations,
            currentBalances,
            _calculatePortfolioValue(_portfolioId),
            portfolio.active
        );
    }
    
    function getUserPortfolios(address _user) external view returns (uint256[] memory) {
        return userPortfolios[_user];
    }
    
    function getTokenTracking(uint256 _portfolioId, address _token) external view returns (
        uint256 entryPrice,
        uint256 peakPrice,
        uint256 peakTimestamp,
        uint256 lastUpdateTime,
        int256 changeFromEntry,
        int256 dropFromPeak
    ) {
        TokenTracking memory tracking = tokenTracking[_portfolioId][_token];
        return (
            tracking.entryPrice,
            tracking.peakPrice,
            tracking.peakTimestamp,
            tracking.lastUpdateTime,
            calculateChangeFromEntry(_portfolioId, _token),
            calculateDropFromPeak(_portfolioId, _token)
        );
    }
    
    function getScheduledAction(uint256 _actionId) external view returns (
        uint256 portfolioId,
        ActionType actionType,
        uint256 executeTime,
        int256 priceCondition,
        int256 percentageCondition,
        bool executed,
        bool active,
        string memory description
    ) {
        ScheduledAction storage action = scheduledActions[_actionId];
        return (
            action.portfolioId,
            action.actionType,
            action.executeTime,
            action.priceCondition,
            action.percentageCondition,
            action.executed,
            action.active,
            action.description
        );
    }
    
    function getPendingActions() external view returns (uint256[] memory) {
        return pendingActions;
    }
    
    // Admin functions - KEEPING ALL YOUR ADMIN FUNCTIONS
    function setPriceFeed(address _token, address _priceFeed) external onlyOwner {
        priceFeeds[_token] = _priceFeed;
    }
    
    function addSupportedToken(address _token, address _priceFeed) external onlyOwner {
        supportedTokens.push(_token);
        isTokenSupported[_token] = true;
        priceFeeds[_token] = _priceFeed;
    }

    /**
     * @dev Execute specific action manually (for direct calls)
     */
    function executeActionManually(uint256 _actionId) external onlyPortfolioOwner(scheduledActions[_actionId].portfolioId) nonReentrant {
        require(scheduledActions[_actionId].active && !scheduledActions[_actionId].executed, "Action not executable");
        
        uint256[] memory actionIds = new uint256[](1);
        actionIds[0] = _actionId;
        _updateRelevantPeaks(actionIds);
        
        _executeAction(_actionId);
    }
}