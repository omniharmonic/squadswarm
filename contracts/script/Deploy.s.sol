// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SquadSwarmEscrow.sol";
import "../src/MockUSDC.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address arbitrator = vm.envAddress("ARBITRATOR_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock USDC for testnet
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // Deploy the escrow contract with arbitrator
        SquadSwarmEscrow escrow = new SquadSwarmEscrow(arbitrator);
        console.log("SquadSwarmEscrow deployed at:", address(escrow));
        console.log("Arbitrator:", arbitrator);

        vm.stopBroadcast();
    }
}
