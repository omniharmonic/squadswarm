// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title SquadSwarmEscrow
/// @notice Singleton escrow contract for all SquadSwarm work contracts.
///         Holds USDC in escrow, releases to PaymentSplitter on milestones/completion.
/// @dev Security audit: CRIT-1 through CRIT-5, HIGH-1 through HIGH-5 addressed.
contract SquadSwarmEscrow {
    using SafeERC20 for IERC20;

    enum Status {
        Created,
        Funded,
        Active,
        Disputed,
        Completed,
        Cancelled
    }

    struct Contract {
        address client;
        address squad;
        address paymentSplitter;
        IERC20 token;
        uint256 totalAmount;
        uint256 upfrontBps;
        uint256 depositedAmount;
        uint256 releasedAmount;
        Status status;
        uint256 disputeDeadline;
        uint256 defaultClientBps;
        uint256 defaultSquadBps;
    }

    /// @notice Platform arbitrator — the only address that can resolve disputes
    address public immutable arbitrator;

    mapping(bytes32 => Contract) public contracts;

    event ContractCreated(
        bytes32 indexed contractId,
        address indexed client,
        address indexed squad,
        uint256 totalAmount,
        address paymentSplitter,
        address token
    );
    event Deposited(bytes32 indexed contractId, uint256 amount, uint256 upfrontReleased);
    event MilestoneReleased(bytes32 indexed contractId, uint256 amount, uint256 totalReleased);
    event Completed(bytes32 indexed contractId, uint256 finalRelease);
    event DisputeRaised(bytes32 indexed contractId, address raisedBy, uint256 deadline);
    event DisputeResolved(
        bytes32 indexed contractId,
        uint256 clientAmount,
        uint256 squadAmount,
        address resolvedBy
    );
    event AutoSplit(bytes32 indexed contractId, uint256 clientAmount, uint256 squadAmount);

    /// @param _arbitrator Platform dispute arbitrator address
    constructor(address _arbitrator) {
        require(_arbitrator != address(0), "Zero arbitrator");
        arbitrator = _arbitrator;
    }

    /// @notice Create a new escrow contract
    /// @param contractId Unique identifier (typically keccak256 of squad+timestamp)
    /// @param squad Squad's multisig or payment address
    /// @param paymentSplitter Deployed PaymentSplitter contract for this squad
    /// @param token ERC20 payment token (USDC)
    /// @param totalAmount Total contract value in token units (USDC has 6 decimals)
    /// @param upfrontBps Percentage released immediately on deposit (basis points, max 5000 = 50%)
    /// @param defaultClientBps Default client share if dispute auto-splits (basis points)
    /// @param defaultSquadBps Default squad share if dispute auto-splits (basis points)
    function createContract(
        bytes32 contractId,
        address squad,
        address paymentSplitter,
        address token,
        uint256 totalAmount,
        uint256 upfrontBps,
        uint256 defaultClientBps,
        uint256 defaultSquadBps
    ) external {
        require(contracts[contractId].client == address(0), "Contract exists");
        require(squad != address(0), "Zero squad address");
        require(squad != msg.sender, "Client cannot be squad");
        require(paymentSplitter != address(0), "Zero splitter address");
        require(token != address(0), "Zero token address");
        require(totalAmount > 0, "Zero amount");
        require(upfrontBps <= 5000, "Upfront exceeds 50%");
        require(defaultClientBps + defaultSquadBps == 10000, "Split must equal 100%");

        contracts[contractId] = Contract({
            client: msg.sender,
            squad: squad,
            paymentSplitter: paymentSplitter,
            token: IERC20(token),
            totalAmount: totalAmount,
            upfrontBps: upfrontBps,
            depositedAmount: 0,
            releasedAmount: 0,
            status: Status.Created,
            disputeDeadline: 0,
            defaultClientBps: defaultClientBps,
            defaultSquadBps: defaultSquadBps
        });

        emit ContractCreated(contractId, msg.sender, squad, totalAmount, paymentSplitter, token);
    }

    /// @notice Client deposits the full contract amount. Upfront percentage is released immediately.
    /// @dev Client must have approved this contract to spend `totalAmount` of the token first.
    function deposit(bytes32 contractId) external {
        Contract storage c = contracts[contractId];
        require(msg.sender == c.client, "Not client");
        require(c.status == Status.Created, "Not in Created status");

        // Pull USDC from client
        c.token.safeTransferFrom(msg.sender, address(this), c.totalAmount);
        c.depositedAmount = c.totalAmount;

        // Release upfront payment to squad's splitter
        uint256 upfront = (c.totalAmount * c.upfrontBps) / 10000;
        if (upfront > 0) {
            c.token.safeTransfer(c.paymentSplitter, upfront);
            c.releasedAmount = upfront;
        }

        c.status = Status.Active;
        emit Deposited(contractId, c.totalAmount, upfront);
    }

    /// @notice Client releases a milestone payment from escrow to the squad's splitter
    function releaseMilestone(bytes32 contractId, uint256 amount) external {
        Contract storage c = contracts[contractId];
        require(msg.sender == c.client, "Not client");
        require(c.status == Status.Active, "Not active");
        require(amount > 0, "Zero release");
        require(c.releasedAmount + amount <= c.depositedAmount, "Exceeds deposit");

        c.token.safeTransfer(c.paymentSplitter, amount);
        c.releasedAmount += amount;

        emit MilestoneReleased(contractId, amount, c.releasedAmount);
    }

    /// @notice Client completes the contract, releasing all remaining escrowed funds
    function complete(bytes32 contractId) external {
        Contract storage c = contracts[contractId];
        require(msg.sender == c.client, "Not client");
        require(c.status == Status.Active, "Not active");

        uint256 remaining = c.depositedAmount - c.releasedAmount;
        if (remaining > 0) {
            c.token.safeTransfer(c.paymentSplitter, remaining);
            c.releasedAmount = c.depositedAmount;
        }

        c.status = Status.Completed;
        emit Completed(contractId, remaining);
    }

    /// @notice Either client or squad can raise a dispute. Starts 14-day resolution period.
    function raiseDispute(bytes32 contractId) external {
        Contract storage c = contracts[contractId];
        require(msg.sender == c.client || msg.sender == c.squad, "Not participant");
        require(c.status == Status.Active, "Not active");

        c.status = Status.Disputed;
        c.disputeDeadline = block.timestamp + 14 days;

        emit DisputeRaised(contractId, msg.sender, c.disputeDeadline);
    }

    /// @notice ONLY the platform arbitrator can resolve disputes with a custom split
    /// @param clientBps Client's share of remaining funds (basis points)
    /// @param squadBps Squad's share of remaining funds (basis points)
    function resolveDispute(
        bytes32 contractId,
        uint256 clientBps,
        uint256 squadBps
    ) external {
        Contract storage c = contracts[contractId];
        require(c.status == Status.Disputed, "Not disputed");
        require(clientBps + squadBps == 10000, "Must equal 100%");
        require(msg.sender == arbitrator, "Only arbitrator");

        uint256 remaining = c.depositedAmount - c.releasedAmount;
        uint256 clientAmount = (remaining * clientBps) / 10000;
        uint256 squadAmount = remaining - clientAmount; // Avoids dust loss

        if (clientAmount > 0) c.token.safeTransfer(c.client, clientAmount);
        if (squadAmount > 0) c.token.safeTransfer(c.paymentSplitter, squadAmount);

        c.releasedAmount = c.depositedAmount;
        c.status = Status.Completed;

        emit DisputeResolved(contractId, clientAmount, squadAmount, msg.sender);
    }

    /// @notice After dispute deadline passes, either participant can trigger the default split
    function autoSplit(bytes32 contractId) external {
        Contract storage c = contracts[contractId];
        require(c.status == Status.Disputed, "Not disputed");
        require(block.timestamp > c.disputeDeadline, "Deadline not reached");
        require(
            msg.sender == c.client || msg.sender == c.squad || msg.sender == arbitrator,
            "Not authorized"
        );

        uint256 remaining = c.depositedAmount - c.releasedAmount;
        uint256 clientAmount = (remaining * c.defaultClientBps) / 10000;
        uint256 squadAmount = remaining - clientAmount; // Avoids dust loss

        if (clientAmount > 0) c.token.safeTransfer(c.client, clientAmount);
        if (squadAmount > 0) c.token.safeTransfer(c.paymentSplitter, squadAmount);

        c.releasedAmount = c.depositedAmount;
        c.status = Status.Completed;

        emit AutoSplit(contractId, clientAmount, squadAmount);
    }

    /// @notice View function to get contract details
    function getContract(bytes32 contractId) external view returns (Contract memory) {
        return contracts[contractId];
    }
}
