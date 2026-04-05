// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title PaymentSplitter
/// @notice Receives ERC20 tokens (USDC) from the escrow contract and splits them
///         among squad members based on configured basis-point shares.
/// @dev Shares are immutable. Dust-free: last member receives the remainder.
///      Only the authorized escrow contract can trigger distribution.
contract PaymentSplitter {
    using SafeERC20 for IERC20;

    address public immutable owner;
    address public immutable escrowContract;
    address[] public members;
    mapping(address => uint256) public shares; // basis points per member
    uint256 public constant TOTAL_SHARES = 10000;

    mapping(IERC20 => mapping(address => uint256)) public released;
    mapping(IERC20 => uint256) public totalReleased;

    event PaymentDistributed(address indexed token, address indexed member, uint256 amount);
    event MembersConfigured(address[] members, uint256[] shares);

    /// @param _members Array of squad member wallet addresses
    /// @param _shares Array of share amounts in basis points (must sum to 10000)
    /// @param _escrowContract Address of the SquadSwarmEscrow contract (only caller of distribute)
    constructor(address[] memory _members, uint256[] memory _shares, address _escrowContract) {
        require(_members.length == _shares.length, "Length mismatch");
        require(_members.length > 0, "No members");
        require(_escrowContract != address(0), "Zero escrow address");

        uint256 total = 0;
        for (uint256 i = 0; i < _shares.length; i++) {
            require(_members[i] != address(0), "Zero address");
            require(_shares[i] > 0, "Zero share");
            total += _shares[i];
        }
        require(total == 10000, "Shares must equal 10000 bps");

        owner = msg.sender;
        escrowContract = _escrowContract;

        for (uint256 i = 0; i < _members.length; i++) {
            members.push(_members[i]);
            shares[_members[i]] = _shares[i];
        }

        emit MembersConfigured(_members, _shares);
    }

    /// @notice Distribute the entire token balance among members.
    ///         Last member receives the remainder to eliminate rounding dust.
    /// @param token The ERC20 token to distribute (typically USDC)
    function distribute(IERC20 token) external {
        require(
            msg.sender == escrowContract || msg.sender == owner,
            "Not authorized"
        );

        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No balance to distribute");

        uint256 distributed = 0;

        // Distribute to all members except the last
        for (uint256 i = 0; i < members.length - 1; i++) {
            address member = members[i];
            uint256 payment = (balance * shares[member]) / TOTAL_SHARES;

            if (payment > 0) {
                distributed += payment;
                released[token][member] += payment;
                totalReleased[token] += payment;
                token.safeTransfer(member, payment);
                emit PaymentDistributed(address(token), member, payment);
            }
        }

        // Last member gets the remainder — eliminates rounding dust
        address lastMember = members[members.length - 1];
        uint256 remainder = balance - distributed;
        if (remainder > 0) {
            released[token][lastMember] += remainder;
            totalReleased[token] += remainder;
            token.safeTransfer(lastMember, remainder);
            emit PaymentDistributed(address(token), lastMember, remainder);
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
        return (balance * shares[member]) / TOTAL_SHARES;
    }

    /// @dev Reject direct ETH transfers
    receive() external payable {
        revert("No ETH accepted");
    }
}
