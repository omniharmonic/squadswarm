// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SquadSwarmEscrow.sol";
import "../src/PaymentSplitter.sol";
import "../src/MockUSDC.sol";

contract SquadSwarmEscrowTest is Test {
    SquadSwarmEscrow escrow;
    PaymentSplitter splitter;
    MockUSDC usdc;

    address client = address(0x1);
    address squad = address(0x2);
    address member1 = address(0x3);
    address member2 = address(0x4);
    address arbitrator = address(0x5);
    address attacker = address(0x6);

    bytes32 contractId = keccak256("test-contract-1");
    uint256 totalAmount = 10_000e6; // $10,000 USDC
    uint256 upfrontBps = 2500; // 25%

    function setUp() public {
        escrow = new SquadSwarmEscrow(arbitrator);
        usdc = new MockUSDC();

        address[] memory members = new address[](2);
        members[0] = member1;
        members[1] = member2;
        uint256[] memory shares = new uint256[](2);
        shares[0] = 7000;
        shares[1] = 3000;
        splitter = new PaymentSplitter(members, shares, address(escrow));

        usdc.mint(client, totalAmount * 2);
    }

    // ═══ Happy Path ═══

    function test_createContract() public {
        vm.prank(client);
        escrow.createContract(contractId, squad, address(splitter), address(usdc), totalAmount, upfrontBps, 5000, 5000);
        SquadSwarmEscrow.Contract memory c = escrow.getContract(contractId);
        assertEq(c.client, client);
        assertEq(c.totalAmount, totalAmount);
        assertEq(uint(c.status), uint(SquadSwarmEscrow.Status.Created));
    }

    function test_deposit_releasesUpfront() public {
        _createContract();
        vm.startPrank(client);
        usdc.approve(address(escrow), totalAmount);
        escrow.deposit(contractId);
        vm.stopPrank();
        uint256 upfront = (totalAmount * upfrontBps) / 10000;
        assertEq(usdc.balanceOf(address(splitter)), upfront);
        assertEq(usdc.balanceOf(address(escrow)), totalAmount - upfront);
    }

    function test_complete_releasesAll() public {
        _createAndDeposit();
        vm.prank(client);
        escrow.complete(contractId);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(usdc.balanceOf(address(splitter)), totalAmount);
    }

    function test_fullFlow() public {
        _createAndDeposit();
        vm.startPrank(client);
        escrow.releaseMilestone(contractId, 2_000e6);
        escrow.complete(contractId);
        vm.stopPrank();
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    // ═══ Security: Dispute Arbitrator ═══

    function test_resolveDispute_onlyArbitrator() public {
        _createAndDeposit();
        vm.prank(client);
        escrow.raiseDispute(contractId);
        vm.prank(client);
        vm.expectRevert("Only arbitrator");
        escrow.resolveDispute(contractId, 10000, 0);
        vm.prank(arbitrator);
        escrow.resolveDispute(contractId, 4000, 6000);
    }

    // ═══ Security: Input Validation ═══

    function test_revert_zeroAmount() public {
        vm.prank(client);
        vm.expectRevert("Zero amount");
        escrow.createContract(contractId, squad, address(splitter), address(usdc), 0, upfrontBps, 5000, 5000);
    }

    function test_revert_selfDealing() public {
        vm.prank(client);
        vm.expectRevert("Client cannot be squad");
        escrow.createContract(contractId, client, address(splitter), address(usdc), totalAmount, upfrontBps, 5000, 5000);
    }

    function test_revert_upfrontTooHigh() public {
        vm.prank(client);
        vm.expectRevert("Upfront exceeds 50%");
        escrow.createContract(contractId, squad, address(splitter), address(usdc), totalAmount, 6000, 5000, 5000);
    }

    function test_revert_duplicateContract() public {
        _createContract();
        vm.prank(client);
        vm.expectRevert("Contract exists");
        escrow.createContract(contractId, squad, address(splitter), address(usdc), totalAmount, upfrontBps, 5000, 5000);
    }

    // ═══ Security: Access Control ═══

    function test_revert_unauthorizedDeposit() public {
        _createContract();
        vm.prank(attacker);
        vm.expectRevert("Not client");
        escrow.deposit(contractId);
    }

    function test_autoSplit_restrictedToParticipants() public {
        _createAndDeposit();
        vm.prank(client);
        escrow.raiseDispute(contractId);
        vm.warp(block.timestamp + 15 days);
        vm.prank(attacker);
        vm.expectRevert("Not authorized");
        escrow.autoSplit(contractId);
        vm.prank(client);
        escrow.autoSplit(contractId);
    }

    function test_dispute_attackerCannotRaise() public {
        _createAndDeposit();
        vm.prank(attacker);
        vm.expectRevert("Not participant");
        escrow.raiseDispute(contractId);
    }

    // ═══ Security: Overflow ═══

    function test_revert_milestoneExceedsDeposit() public {
        _createAndDeposit();
        vm.prank(client);
        vm.expectRevert("Exceeds deposit");
        escrow.releaseMilestone(contractId, totalAmount);
    }

    function test_revert_zeroMilestone() public {
        _createAndDeposit();
        vm.prank(client);
        vm.expectRevert("Zero release");
        escrow.releaseMilestone(contractId, 0);
    }

    // ═══ Distribution ═══

    function test_splitter_dustFree() public {
        _createAndDeposit();
        vm.prank(client);
        escrow.complete(contractId);
        vm.prank(address(escrow));
        splitter.distribute(usdc);
        uint256 total = usdc.balanceOf(member1) + usdc.balanceOf(member2);
        assertEq(total, totalAmount, "Dust-free: all USDC distributed");
    }

    function test_splitter_restrictedDistribute() public {
        _createAndDeposit();
        vm.prank(client);
        escrow.complete(contractId);
        vm.prank(attacker);
        vm.expectRevert("Not authorized");
        splitter.distribute(usdc);
    }

    // ═══ Helpers ═══

    function _createContract() internal {
        vm.prank(client);
        escrow.createContract(contractId, squad, address(splitter), address(usdc), totalAmount, upfrontBps, 5000, 5000);
    }

    function _createAndDeposit() internal {
        _createContract();
        vm.startPrank(client);
        usdc.approve(address(escrow), totalAmount);
        escrow.deposit(contractId);
        vm.stopPrank();
    }
}
