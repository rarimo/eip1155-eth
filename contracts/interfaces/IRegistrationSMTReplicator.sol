// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRegistrationSMTReplicator {
    function transitionRoot(
        bytes32 newRoot_,
        uint256 transitionTimestamp_,
        bytes calldata proof_
    ) external;

    function transitionRootSimple(
        bytes32 newRoot_,
        uint256 transitionTimestamp_,
        bytes calldata signature_
    ) external;

    function isRootValid(bytes32 root_) external view returns (bool);

    function isRootLatest(bytes32 root_) external view returns (bool);
}
