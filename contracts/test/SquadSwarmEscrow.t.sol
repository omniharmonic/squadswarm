// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SquadSwarmEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract SquadSwarmEscrowTest is Test {
    SquadSwarmEscrow public escrow;
    MockUSDC public usdc;

    address client = address(0x1);
    address squad = address(0x2);
    address splitter = address(0x3);

    bytes32 contractId = keccak256("test-contract-1");
    uint256 totalAmount = 10_000 * 10 ** 6; // 10,000 USDC

    function setUp() public {
        escrow = new SquadSwarmEscrow();
        usdc = new MockUSDC();

        // Transfer USDC to client
        usdc.transfer(client, totalAmount);
    }

    function testCreateContract() public {
        vm.prank(client);
        escrow.createContract(contractId, squad, splitter, address(usdc), totalAmount, 2500, 5000, 5000);

        SquadSwarmEscrow.Contract memory c = escrow.getContract(contractId);
        assertEq(c.client, client);
        assertEq(c.squad, squad);
        assertEq(c.totalAmount, totalAmount);
        assertEq(uint256(c.status), uint256(SquadSwarmEscrow.Status.Created));
    }

    function testCreateContractDuplicate() public {
        vm.prank(client);
        escrow.createContract(contractId, squad, splitter, address(usdc), totalAmount, 2500, 5000, 5000);

        vm.prank(client);
        vm.expectRevert("Contract exists");
        escrow.createContract(contractId, squad, splitter, address(usdc), totalAmount, 2500, 5000, 5000);
    }

    function testCreateContractInvalidSplit() public {
        vm.prank(client);
        vm.expectRevert("Split must equal 100%");
        escrow.createContract(contractId, squad, splitter, address(usdc), totalAmount, 2500, 3000, 5000);
    }

    function testDepositAndUpfront() public {
        vm.prank(client);
        escrow.createContract(contractId, squad, splitter, address(usdc), totalAmount, 2500, 5000, 5000);

        // Approve and deposit
        vm.startPrank(client);
        usdc.approve(address(escrow), totalAmount);
        escrow.deposit(contractId);
        vm.stopPrank();

        SquadSwarmEscrow.Contract memory c = escrow.getContract(contractId);
        assertEq(c.depositedAmount, totalAmount);
        assertEq(uint256(c.status), uint256(SquadSwarmEscrow.Status.Active));

        // 25% upfront = 2,500 USDC
        uint256 upfront = (totalAmount * 2500) / 10000;
        assertEq(c.releasedAmount, upfront);
        assertEq(usdc.balanceOf(splitter), upfront);
    }

    function testDepositNotClient() public {
        vm.prank(client);
        escrow.createContract(contractId, squad, splitter, address(usdc), totalAmount, 2500, 5000, 5000);

        vm.prank(squad);
        vm.expectRevert("Not client");
        escrow.deposit(contractId);
    }

    function testReleaseMilestone() public {
        _createAndFund();

        uint256 milestoneAmount = 2000 * 10 ** 6;
        vm.prank(client);
        escrow.releaseMilestone(contractId, milestoneAmount);

        SquadSwarmEscrow.Contract memory c = escrow.getContract(contractId);
        uint256 upfront = (totalAmount * 2500) / 10000;
        assertEq(c.releasedAmount, upfront + milestoneAmount);
    }

    function testReleaseMilestoneExceedsDeposit() public {
        _createAndFund();

        vm.prank(client);
        vm.expectRevert("Exceeds deposit");
        escrow.releaseMilestone(contractId, totalAmount); // more than remaining
    }

    function testComplete() public {
        _createAndFund();

        vm.prank(client);
        escrow.complete(contractId);

        SquadSwarmEscrow.Contract memory c = escrow.getContract(contractId);
        assertEq(uint256(c.status), uint256(SquadSwarmEscrow.Status.Completed));
        assertEq(c.releasedAmount, c.depositedAmount);
        assertEq(usdc.balanceOf(splitter), totalAmount);
    }

    function testRaiseDisputeByClient() public {
        _createAndFund();

        vm.prank(client);
        escrow.raiseDispute(contractId);

        SquadSwarmEscrow.Contract memory c = escrow.getContract(contractId);
        assertEq(uint256(c.status), uint256(SquadSwarmEscrow.Status.Disputed));
        assertEq(c.disputeDeadline, block.timestamp + 14 days);
    }

    function testRaiseDisputeBySquad() public {
        _createAndFund();

        vm.prank(squad);
        escrow.raiseDispute(contractId);

        SquadSwarmEscrow.Contract memory c = escrow.getContract(contractId);
        assertEq(uint256(c.status), uint256(SquadSwarmEscrow.Status.Disputed));
    }

    function testResolveDispute() public {
        _createAndFund();

        vm.prank(client);
        escrow.raiseDispute(contractId);

        uint256 upfront = (totalAmount * 2500) / 10000;
        uint256 remaining = totalAmount - upfront;
        uint256 expectedClientAmount = (remaining * 3000) / 10000;
        uint256 expectedSquadAmount = remaining - expectedClientAmount;

        uint256 clientBalBefore = usdc.balanceOf(client);
        uint256 splitterBalBefore = usdc.balanceOf(splitter);

        vm.prank(client);
        escrow.resolveDispute(contractId, 3000, 7000);

        assertEq(usdc.balanceOf(client) - clientBalBefore, expectedClientAmount);
        assertEq(usdc.balanceOf(splitter) - splitterBalBefore, expectedSquadAmount);

        SquadSwarmEscrow.Contract memory c = escrow.getContract(contractId);
        assertEq(uint256(c.status), uint256(SquadSwarmEscrow.Status.Completed));
    }

    function testAutoSplitBeforeDeadline() public {
        _createAndFund();

        vm.prank(client);
        escrow.raiseDispute(contractId);

        vm.expectRevert("Deadline not reached");
        escrow.autoSplit(contractId);
    }

    function testAutoSplitAfterDeadline() public {
        _createAndFund();

        vm.prank(client);
        escrow.raiseDispute(contractId);

        // Warp past deadline
        vm.warp(block.timestamp + 15 days);

        uint256 upfront = (totalAmount * 2500) / 10000;
        uint256 remaining = totalAmount - upfront;
        uint256 expectedClientAmount = (remaining * 5000) / 10000;
        uint256 expectedSquadAmount = remaining - expectedClientAmount;

        uint256 clientBalBefore = usdc.balanceOf(client);
        uint256 splitterBalBefore = usdc.balanceOf(splitter);

        escrow.autoSplit(contractId);

        assertEq(usdc.balanceOf(client) - clientBalBefore, expectedClientAmount);
        assertEq(usdc.balanceOf(splitter) - splitterBalBefore, expectedSquadAmount);
    }

    // --- Helpers ---

    function _createAndFund() internal {
        vm.prank(client);
        escrow.createContract(contractId, squad, splitter, address(usdc), totalAmount, 2500, 5000, 5000);

        vm.startPrank(client);
        usdc.approve(address(escrow), totalAmount);
        escrow.deposit(contractId);
        vm.stopPrank();
    }
}
