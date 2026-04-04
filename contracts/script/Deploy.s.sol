// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SquadSwarmEscrow.sol";
import "../src/PaymentSplitter.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the escrow contract
        SquadSwarmEscrow escrow = new SquadSwarmEscrow();
        console.log("SquadSwarmEscrow deployed at:", address(escrow));

        vm.stopBroadcast();
    }
}
