// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

import {VerifierHelper} from "@solarity/solidity-lib/libs/zkp/snarkjs/VerifierHelper.sol";

import {DateDecoder} from "./libs/DateDecoder.sol";

import {IRegistrationSMTReplicator} from "./interfaces/IRegistrationSMTReplicator.sol";

contract ERC1155ETH is ERC1155Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    using VerifierHelper for address;

    struct UserData {
        uint256 nullifier;
        uint256 identityCreationTimestamp;
        uint256 identityCounter;
    }

    struct TransitionData {
        bytes32 newRoot;
        uint256 transitionTimestamp;
        bytes proof;
    }

    uint256 public constant PROOF_SIGNALS_COUNT = 23;
    uint256 public constant ZERO_DATE = 0x303030303030;
    uint256 public constant SELECTOR = 0x1A01; // 0b1101000000001

    uint256 public initTimestamp;
    uint256 public magicTokenId;

    address public identityProofVerifier;
    IRegistrationSMTReplicator public state;

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
    error InvalidCurrentDate(
        uint256 encodedDate,
        uint256 encodedDateTimestamp,
        uint256 blockTimestamp
    );

    constructor() {
        _disableInitializers();
    }

    function __ERC1155ETH_init(
        uint256 magicTokenId_,
        address identityProofVerifier_,
        address state_,
        string memory uri_
    ) public initializer {
        __Ownable_init(_msgSender());
        __ERC1155_init(uri_);

        magicTokenId = magicTokenId_;

        initTimestamp = block.timestamp;

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
            transitionData_.newRoot,
            transitionData_.transitionTimestamp,
            transitionData_.proof
        );

        _mintLogic(transitionData_.newRoot, receiver_, currentDate_, userData_, zkPoints_);
    }

    function mintWithSimpleRootTransition(
        TransitionData memory transitionData_,
        address receiver_,
        uint256 currentDate_,
        UserData memory userData_,
        VerifierHelper.ProofPoints memory zkPoints_
    ) public {
        state.transitionRootSimple(
            transitionData_.newRoot,
            transitionData_.transitionTimestamp,
            transitionData_.proof
        );

        _mintLogic(transitionData_.newRoot, receiver_, currentDate_, userData_, zkPoints_);
    }

    function setURI(string memory newURI_) public onlyOwner {
        _setURI(newURI_);
    }

    function isNullifierUsed(uint256 nullifier) public view returns (bool) {
        return nullifiers[nullifier];
    }

    function _mintLogic(
        bytes32 registrationRoot_,
        address receiver_,
        uint256 currentDate_,
        UserData memory userData_,
        VerifierHelper.ProofPoints memory zkPoints_
    ) private {
        require(state.isRootValid(registrationRoot_), InvalidRoot(registrationRoot_));
        require(!nullifiers[userData_.nullifier], NullifierUsed(userData_.nullifier));

        uint256[] memory pubSignals_ = new uint256[](PROOF_SIGNALS_COUNT);

        uint256 timestampUpperbound_;
        uint256 identityCounterUpperbound_;

        if (userData_.identityCreationTimestamp > initTimestamp) {
            timestampUpperbound_ = userData_.identityCreationTimestamp;
            identityCounterUpperbound_ = 1;
        } else {
            timestampUpperbound_ = initTimestamp;
            identityCounterUpperbound_ = userData_.identityCounter + 1;
        }

        uint256 currentDateInTimestamp_ = DateDecoder.decodeDate(currentDate_);
        require(
            currentDateInTimestamp_ + 1 days > block.timestamp,
            InvalidCurrentDate(currentDate_, currentDateInTimestamp_, block.timestamp)
        );

        pubSignals_[0] = userData_.nullifier; // output, nullifier
        pubSignals_[9] = magicTokenId; // input, eventId
        pubSignals_[10] = uint248(uint256(keccak256(abi.encode(receiver_)))); // input, eventData
        pubSignals_[11] = uint256(registrationRoot_); // input, idStateRoot
        pubSignals_[12] = SELECTOR; // input, selector
        pubSignals_[13] = currentDate_; // input, currentDate
        pubSignals_[15] = timestampUpperbound_; // input, timestampUpperbound
        pubSignals_[17] = identityCounterUpperbound_; // input, identityCounterUpperbound
        pubSignals_[18] = ZERO_DATE; // input, birthDateLowerbound
        pubSignals_[19] = ZERO_DATE; // input, birthDateUpperbound
        pubSignals_[20] = currentDate_; // input, expirationDateLowerbound
        pubSignals_[21] = ZERO_DATE; // input, expirationDateUpperbound

        require(identityProofVerifier.verifyProof(pubSignals_, zkPoints_), InvalidProof());
        require(balanceOf(receiver_, magicTokenId) == 0, UserAlreadyRegistered(receiver_));

        nullifiers[userData_.nullifier] = true;

        _mint(receiver_, magicTokenId, 1, new bytes(0));

        emit MagicTokenMinted(receiver_, magicTokenId, 1, userData_.nullifier);
    }

    // solhint-disable-next-line no-empty-blocks
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function implementation() external view returns (address) {
        return ERC1967Utils.getImplementation();
    }
}
