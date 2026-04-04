// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title PaymentSplitter
/// @notice Receives ERC20 tokens (USDC) and splits them among squad members based on configured shares.
/// @dev Shares are set at construction and are immutable. New members require deploying a new splitter.
contract PaymentSplitter {
    using SafeERC20 for IERC20;

    address public immutable owner;
    address[] public members;
    mapping(address => uint256) public shares; // basis points per member
    uint256 public totalShares;

    mapping(IERC20 => mapping(address => uint256)) public released;
    mapping(IERC20 => uint256) public totalReleased;

    event PaymentDistributed(address indexed token, address indexed member, uint256 amount);
    event MembersConfigured(address[] members, uint256[] shares);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @param _members Array of squad member addresses
    /// @param _shares Array of share amounts in basis points (must sum to 10000)
    constructor(address[] memory _members, uint256[] memory _shares) {
        require(_members.length == _shares.length, "Length mismatch");
        require(_members.length > 0, "No members");

        uint256 total = 0;
        for (uint256 i = 0; i < _shares.length; i++) {
            require(_members[i] != address(0), "Zero address");
            require(_shares[i] > 0, "Zero share");
            total += _shares[i];
        }
        require(total == 10000, "Shares must equal 10000 bps");

        owner = msg.sender;

        for (uint256 i = 0; i < _members.length; i++) {
            members.push(_members[i]);
            shares[_members[i]] = _shares[i];
        }
        totalShares = 10000;

        emit MembersConfigured(_members, _shares);
    }

    /// @notice Distribute the entire token balance of this contract among members
    /// @param token The ERC20 token to distribute
    function distribute(IERC20 token) external {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No balance to distribute");

        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            uint256 payment = (balance * shares[member]) / totalShares;

            if (payment > 0) {
                released[token][member] += payment;
                totalReleased[token] += payment;
                token.safeTransfer(member, payment);

                emit PaymentDistributed(address(token), member, payment);
            }
        }
    }

    /// @notice Get the number of members
    function memberCount() external view returns (uint256) {
        return members.length;
    }

    /// @notice Get all members and their shares
    function getMembers() external view returns (address[] memory, uint256[] memory) {
        uint256[] memory memberShares = new uint256[](members.length);
        for (uint256 i = 0; i < members.length; i++) {
            memberShares[i] = shares[members[i]];
        }
        return (members, memberShares);
    }

    /// @notice Get the pending balance for a specific member
    function pendingPayment(IERC20 token, address member) external view returns (uint256) {
        uint256 balance = token.balanceOf(address(this));
        return (balance * shares[member]) / totalShares;
    }
}
