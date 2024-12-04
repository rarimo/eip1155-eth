// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

import {VerifierHelper} from "@solarity/solidity-lib/libs/zkp/snarkjs/VerifierHelper.sol";

import {IRegistrationSMTReplicator} from "./interfaces/IRegistrationSMTReplicator.sol";

contract ERC1155ETH is ERC1155 {
    using VerifierHelper for address;

    struct UserData {
        uint256 nullifier;
        uint256 identityCreationTimestamp;
        uint256 identityCounter;
    }

    struct TransitionData {
        bytes32 newRoot_;
        uint256 transitionTimestamp_;
        bytes proof;
    }

    uint256 public constant PROOF_SIGNALS_COUNT = 24;
    uint256 public constant IDENTITY_LIMIT = type(uint32).max;
    uint256 public constant ZERO_DATE = 0x303030303030;
    uint256 public constant SELECTOR = 0x5a21; // 0b101101000100001

    uint256 public immutable initTimestamp = block.timestamp;

    uint256 public immutable magicTokenId;

    address public immutable identityProofVerifier;
    IRegistrationSMTReplicator public immutable state;

    mapping(uint256 => bool) public nullifiers;

    event MagicTokenMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 value,
        uint256 nullifier
    );

    error InvalidRoot(bytes32 registrationRoot);
    error NullifierUsed(uint256 nullifier);
    error InvalidProof();
    error UserAlreadyRegistered(address user);

    constructor(
        uint256 magicTokenId_,
        address identityProofVerifier_,
        address state_
    ) ERC1155("") {
        magicTokenId = magicTokenId_;

        identityProofVerifier = identityProofVerifier_;
        state = IRegistrationSMTReplicator(state_);
    }

    function mint(
        bytes32 registrationRoot_,
        address receiver_,
        uint256 currentDate_,
        UserData memory userData_,
        VerifierHelper.ProofPoints memory zkPoints_
    ) public {
        _mintLogic(registrationRoot_, receiver_, currentDate_, userData_, zkPoints_);
    }

    function mintWithRootTransition(
        TransitionData memory transitionData_,
        address receiver_,
        uint256 currentDate_,
        UserData memory userData_,
        VerifierHelper.ProofPoints memory zkPoints_
    ) public {
        state.transitionRoot(
            transitionData_.newRoot_,
            transitionData_.transitionTimestamp_,
            transitionData_.proof
        );

        _mintLogic(transitionData_.newRoot_, receiver_, currentDate_, userData_, zkPoints_);
    }

    function mintWithSimpleRootTransition(
        TransitionData memory transitionData_,
        address receiver_,
        uint256 currentDate_,
        UserData memory userData_,
        VerifierHelper.ProofPoints memory zkPoints_
    ) public {
        state.transitionRootSimple(
            transitionData_.newRoot_,
            transitionData_.transitionTimestamp_,
            transitionData_.proof
        );

        _mintLogic(transitionData_.newRoot_, receiver_, currentDate_, userData_, zkPoints_);
    }

    function _mintLogic(
        bytes32 registrationRoot_,
        address receiver_,
        uint256 currentDate_,
        UserData memory userData_,
        VerifierHelper.ProofPoints memory zkPoints_
    ) public {
        require(state.isRootValid(registrationRoot_), InvalidRoot(registrationRoot_));
        require(!nullifiers[userData_.nullifier], NullifierUsed(userData_.nullifier));

        uint256 identityCounterUpperBound = IDENTITY_LIMIT;

        uint256[] memory pubSignals_ = new uint256[](PROOF_SIGNALS_COUNT);

        uint256 timestampUpperbound_;
        uint256 identityCounterUpperbound_;

        if (userData_.identityCreationTimestamp > initTimestamp) {
            timestampUpperbound_ = type(uint32).max;
            identityCounterUpperbound_ = 0;
        } else {
            timestampUpperbound_ = initTimestamp;
            identityCounterUpperbound_ = userData_.identityCounter;
        }

        pubSignals_[0] = userData_.nullifier; // output, nullifier
        pubSignals_[10] = magicTokenId; // input, eventId
        pubSignals_[11] = uint248(uint256(keccak256(abi.encode(receiver_)))); // input, eventData
        pubSignals_[12] = uint256(registrationRoot_); // input, idStateRoot
        pubSignals_[13] = SELECTOR; // input, selector
        pubSignals_[14] = currentDate_; // input, currentDate
        pubSignals_[16] = timestampUpperbound_; // input, timestampUpperbound
        pubSignals_[18] = identityCounterUpperbound_; // input, identityCounterUpperbound
        pubSignals_[19] = ZERO_DATE; // input, birthDateLowerbound
        pubSignals_[20] = ZERO_DATE; // input, birthDateUpperbound
        pubSignals_[21] = ZERO_DATE; // input, expirationDateLowerbound
        pubSignals_[22] = ZERO_DATE; // input, expirationDateUpperbound

        require(identityProofVerifier.verifyProof(pubSignals_, zkPoints_), InvalidProof());
        require(balanceOf(receiver_, magicTokenId) == 0, UserAlreadyRegistered(receiver_));

        _mint(receiver_, magicTokenId, 1, new bytes(0));

        emit MagicTokenMinted(receiver_, magicTokenId, 1, userData_.nullifier);
    }

    function isNullifierUsed(uint256 nullifier) public view returns (bool) {
        return nullifiers[nullifier];
    }
}
