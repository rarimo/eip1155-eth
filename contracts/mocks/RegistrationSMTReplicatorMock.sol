// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRegistrationSMTReplicator} from "../interfaces/IRegistrationSMTReplicator.sol";

contract RegistrationSMTReplicatorMock is IRegistrationSMTReplicator {
    mapping(bytes32 => bool) public roots;

    function transitionRoot(bytes32 newRoot_, uint256, bytes calldata) external {
        roots[newRoot_] = true;
    }

    function transitionRootSimple(bytes32 newRoot_, uint256, bytes calldata) external {
        roots[newRoot_] = true;
    }

    function isRootValid(bytes32 root_) external view returns (bool) {
        return roots[root_];
    }

    function isRootLatest(bytes32 root_) external view returns (bool) {
        return roots[root_];
    }
}
