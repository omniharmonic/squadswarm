// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PaymentSplitter.sol";
import "../src/MockUSDC.sol";

contract PaymentSplitterTest is Test {
    PaymentSplitter public splitter;
    MockUSDC public usdc;

    address escrowAddr = address(0x99);
    address member1 = address(0x10);
    address member2 = address(0x20);
    address member3 = address(0x30);
    address attacker = address(0x66);

    function setUp() public {
        address[] memory members = new address[](3);
        members[0] = member1;
        members[1] = member2;
        members[2] = member3;

        uint256[] memory shares = new uint256[](3);
        shares[0] = 5000; // 50%
        shares[1] = 3000; // 30%
        shares[2] = 2000; // 20%

        splitter = new PaymentSplitter(members, shares, escrowAddr);
        usdc = new MockUSDC();
    }

    function testConstructor() public view {
        assertEq(splitter.memberCount(), 3);
        assertEq(splitter.shares(member1), 5000);
        assertEq(splitter.shares(member2), 3000);
        assertEq(splitter.shares(member3), 2000);
        assertEq(splitter.escrowContract(), escrowAddr);
    }

    function testConstructorLengthMismatch() public {
        address[] memory members = new address[](2);
        members[0] = member1;
        members[1] = member2;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;
        vm.expectRevert("Length mismatch");
        new PaymentSplitter(members, shares, escrowAddr);
    }

    function testConstructorNoMembers() public {
        address[] memory members = new address[](0);
        uint256[] memory shares = new uint256[](0);
        vm.expectRevert("No members");
        new PaymentSplitter(members, shares, escrowAddr);
    }

    function testConstructorInvalidShares() public {
        address[] memory members = new address[](2);
        members[0] = member1;
        members[1] = member2;
        uint256[] memory shares = new uint256[](2);
        shares[0] = 5000;
        shares[1] = 4000;
        vm.expectRevert("Shares must equal 10000 bps");
        new PaymentSplitter(members, shares, escrowAddr);
    }

    function testConstructorZeroAddress() public {
        address[] memory members = new address[](1);
        members[0] = address(0);
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;
        vm.expectRevert("Zero address");
        new PaymentSplitter(members, shares, escrowAddr);
    }

    function testConstructorZeroShare() public {
        address[] memory members = new address[](2);
        members[0] = member1;
        members[1] = member2;
        uint256[] memory shares = new uint256[](2);
        shares[0] = 10000;
        shares[1] = 0;
        vm.expectRevert("Zero share");
        new PaymentSplitter(members, shares, escrowAddr);
    }

    function testDistribute() public {
        uint256 depositAmount = 10_000e6;
        usdc.mint(address(splitter), depositAmount);

        vm.prank(escrowAddr);
        splitter.distribute(IERC20(address(usdc)));

        uint256 total = usdc.balanceOf(member1) + usdc.balanceOf(member2) + usdc.balanceOf(member3);
        assertEq(total, depositAmount, "Dust-free: all funds distributed");
    }

    function testDistributeNoBalance() public {
        vm.prank(escrowAddr);
        vm.expectRevert("No balance to distribute");
        splitter.distribute(IERC20(address(usdc)));
    }

    function testDistributeMultipleTimes() public {
        usdc.mint(address(splitter), 10_000e6);
        vm.prank(escrowAddr);
        splitter.distribute(IERC20(address(usdc)));

        usdc.mint(address(splitter), 5_000e6);
        vm.prank(escrowAddr);
        splitter.distribute(IERC20(address(usdc)));

        uint256 total = usdc.balanceOf(member1) + usdc.balanceOf(member2) + usdc.balanceOf(member3);
        assertEq(total, 15_000e6, "All distributed across 2 rounds");
    }

    function testDistributeUnauthorized() public {
        usdc.mint(address(splitter), 10_000e6);
        vm.prank(attacker);
        vm.expectRevert("Not authorized");
        splitter.distribute(IERC20(address(usdc)));
    }

    function testRejectETH() public {
        vm.deal(attacker, 1 ether);
        vm.prank(attacker);
        vm.expectRevert("No ETH accepted");
        (bool sent,) = address(splitter).call{value: 1 ether}("");
    }

    function testGetMembers() public view {
        (address[] memory members, uint256[] memory shares) = splitter.getMembers();
        assertEq(members.length, 3);
        assertEq(members[0], member1);
        assertEq(shares[0], 5000);
    }

    function testPendingPayment() public {
        usdc.mint(address(splitter), 10_000e6);
        assertEq(splitter.pendingPayment(IERC20(address(usdc)), member1), 5_000e6);
        assertEq(splitter.pendingPayment(IERC20(address(usdc)), member2), 3_000e6);
        assertEq(splitter.pendingPayment(IERC20(address(usdc)), member3), 2_000e6);
    }
}
