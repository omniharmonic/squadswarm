// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

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
        address squad; // multisig or single address
        address paymentSplitter;
        IERC20 token; // USDC
        uint256 totalAmount;
        uint256 upfrontBps; // basis points (2500 = 25%)
        uint256 depositedAmount;
        uint256 releasedAmount;
        Status status;
        uint256 disputeDeadline;
        uint256 defaultClientBps; // default dispute split
        uint256 defaultSquadBps;
    }

    mapping(bytes32 => Contract) public contracts;

    event ContractCreated(bytes32 indexed contractId, address client, address squad, uint256 totalAmount);
    event Deposited(bytes32 indexed contractId, uint256 amount);
    event Released(bytes32 indexed contractId, uint256 amount, address to);
    event DisputeRaised(bytes32 indexed contractId, uint256 deadline);
    event DisputeResolved(bytes32 indexed contractId, uint256 clientAmount, uint256 squadAmount);
    event Completed(bytes32 indexed contractId);

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

        emit ContractCreated(contractId, msg.sender, squad, totalAmount);
    }

    function deposit(bytes32 contractId) external {
        Contract storage c = contracts[contractId];
        require(msg.sender == c.client, "Not client");
        require(c.status == Status.Created, "Not in Created status");

        c.token.safeTransferFrom(msg.sender, address(this), c.totalAmount);
        c.depositedAmount = c.totalAmount;
        c.status = Status.Funded;

        // Release upfront payment
        uint256 upfront = (c.totalAmount * c.upfrontBps) / 10000;
        if (upfront > 0) {
            c.token.safeTransfer(c.paymentSplitter, upfront);
            c.releasedAmount = upfront;
            c.status = Status.Active;
        }

        emit Deposited(contractId, c.totalAmount);
    }

    function releaseMilestone(bytes32 contractId, uint256 amount) external {
        Contract storage c = contracts[contractId];
        require(msg.sender == c.client, "Not client");
        require(c.status == Status.Active, "Not active");
        require(c.releasedAmount + amount <= c.depositedAmount, "Exceeds deposit");

        c.token.safeTransfer(c.paymentSplitter, amount);
        c.releasedAmount += amount;

        emit Released(contractId, amount, c.paymentSplitter);
    }

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
        emit Completed(contractId);
    }

    function raiseDispute(bytes32 contractId) external {
        Contract storage c = contracts[contractId];
        require(msg.sender == c.client || msg.sender == c.squad, "Not participant");
        require(c.status == Status.Active, "Not active");

        c.status = Status.Disputed;
        c.disputeDeadline = block.timestamp + 14 days;

        emit DisputeRaised(contractId, c.disputeDeadline);
    }

    function resolveDispute(bytes32 contractId, uint256 clientBps, uint256 squadBps) external {
        Contract storage c = contracts[contractId];
        require(c.status == Status.Disputed, "Not disputed");
        require(clientBps + squadBps == 10000, "Must equal 100%");
        // In production, this would require multi-sig approval
        require(msg.sender == c.client || msg.sender == c.squad, "Not participant");

        uint256 remaining = c.depositedAmount - c.releasedAmount;
        uint256 clientAmount = (remaining * clientBps) / 10000;
        uint256 squadAmount = remaining - clientAmount;

        if (clientAmount > 0) c.token.safeTransfer(c.client, clientAmount);
        if (squadAmount > 0) c.token.safeTransfer(c.paymentSplitter, squadAmount);

        c.releasedAmount = c.depositedAmount;
        c.status = Status.Completed;

        emit DisputeResolved(contractId, clientAmount, squadAmount);
    }

    function autoSplit(bytes32 contractId) external {
        Contract storage c = contracts[contractId];
        require(c.status == Status.Disputed, "Not disputed");
        require(block.timestamp > c.disputeDeadline, "Deadline not reached");

        uint256 remaining = c.depositedAmount - c.releasedAmount;
        uint256 clientAmount = (remaining * c.defaultClientBps) / 10000;
        uint256 squadAmount = remaining - clientAmount;

        if (clientAmount > 0) c.token.safeTransfer(c.client, clientAmount);
        if (squadAmount > 0) c.token.safeTransfer(c.paymentSplitter, squadAmount);

        c.releasedAmount = c.depositedAmount;
        c.status = Status.Completed;

        emit DisputeResolved(contractId, clientAmount, squadAmount);
    }

    function getContract(bytes32 contractId) external view returns (Contract memory) {
        return contracts[contractId];
    }
}
