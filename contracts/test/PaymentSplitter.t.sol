// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PaymentSplitter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract PaymentSplitterTest is Test {
    PaymentSplitter public splitter;
    MockUSDC public usdc;

    address member1 = address(0x10);
    address member2 = address(0x20);
    address member3 = address(0x30);

    function setUp() public {
        address[] memory members = new address[](3);
        members[0] = member1;
        members[1] = member2;
        members[2] = member3;

        uint256[] memory shares = new uint256[](3);
        shares[0] = 5000; // 50%
        shares[1] = 3000; // 30%
        shares[2] = 2000; // 20%

        splitter = new PaymentSplitter(members, shares);
        usdc = new MockUSDC();
    }

    function testConstructor() public view {
        assertEq(splitter.memberCount(), 3);
        assertEq(splitter.shares(member1), 5000);
        assertEq(splitter.shares(member2), 3000);
        assertEq(splitter.shares(member3), 2000);
        assertEq(splitter.totalShares(), 10000);
    }

    function testConstructorLengthMismatch() public {
        address[] memory members = new address[](2);
        members[0] = member1;
        members[1] = member2;

        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.expectRevert("Length mismatch");
        new PaymentSplitter(members, shares);
    }

    function testConstructorNoMembers() public {
        address[] memory members = new address[](0);
        uint256[] memory shares = new uint256[](0);

        vm.expectRevert("No members");
        new PaymentSplitter(members, shares);
    }

    function testConstructorInvalidShares() public {
        address[] memory members = new address[](2);
        members[0] = member1;
        members[1] = member2;

        uint256[] memory shares = new uint256[](2);
        shares[0] = 5000;
        shares[1] = 4000; // only 9000 total

        vm.expectRevert("Shares must equal 10000 bps");
        new PaymentSplitter(members, shares);
    }

    function testConstructorZeroAddress() public {
        address[] memory members = new address[](1);
        members[0] = address(0);

        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.expectRevert("Zero address");
        new PaymentSplitter(members, shares);
    }

    function testConstructorZeroShare() public {
        address[] memory members = new address[](2);
        members[0] = member1;
        members[1] = member2;

        uint256[] memory shares = new uint256[](2);
        shares[0] = 10000;
        shares[1] = 0;

        vm.expectRevert("Zero share");
        new PaymentSplitter(members, shares);
    }

    function testDistribute() public {
        uint256 depositAmount = 10_000 * 10 ** 6;
        usdc.transfer(address(splitter), depositAmount);

        splitter.distribute(IERC20(address(usdc)));

        assertEq(usdc.balanceOf(member1), 5_000 * 10 ** 6); // 50%
        assertEq(usdc.balanceOf(member2), 3_000 * 10 ** 6); // 30%
        assertEq(usdc.balanceOf(member3), 2_000 * 10 ** 6); // 20%
    }

    function testDistributeNoBalance() public {
        vm.expectRevert("No balance to distribute");
        splitter.distribute(IERC20(address(usdc)));
    }

    function testDistributeMultipleTimes() public {
        uint256 firstDeposit = 10_000 * 10 ** 6;
        usdc.transfer(address(splitter), firstDeposit);
        splitter.distribute(IERC20(address(usdc)));

        uint256 secondDeposit = 5_000 * 10 ** 6;
        usdc.transfer(address(splitter), secondDeposit);
        splitter.distribute(IERC20(address(usdc)));

        // Total: 15,000 USDC distributed
        assertEq(usdc.balanceOf(member1), 7_500 * 10 ** 6);
        assertEq(usdc.balanceOf(member2), 4_500 * 10 ** 6);
        assertEq(usdc.balanceOf(member3), 3_000 * 10 ** 6);
    }

    function testGetMembers() public view {
        (address[] memory members, uint256[] memory shares) = splitter.getMembers();
        assertEq(members.length, 3);
        assertEq(members[0], member1);
        assertEq(shares[0], 5000);
    }

    function testPendingPayment() public {
        uint256 depositAmount = 10_000 * 10 ** 6;
        usdc.transfer(address(splitter), depositAmount);

        assertEq(splitter.pendingPayment(IERC20(address(usdc)), member1), 5_000 * 10 ** 6);
        assertEq(splitter.pendingPayment(IERC20(address(usdc)), member2), 3_000 * 10 ** 6);
        assertEq(splitter.pendingPayment(IERC20(address(usdc)), member3), 2_000 * 10 ** 6);
    }
}
