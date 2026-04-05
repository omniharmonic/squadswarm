// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice A mintable ERC20 for testing the escrow system on testnets
/// @dev DO NOT deploy to mainnet
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin (Test)", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Anyone can mint test tokens
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
