import { expect } from "chai";
import { ethers, zkit } from "hardhat";

import { Groth16Proof } from "@solarity/zkit";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { Reverter, CURRENT_DATE, getQueryInputs, encodeDate } from "@helpers";

import { ProofqueryIdentityGroth16, queryIdentity } from "@zkit";

import { ERC1155ETH, RegistrationSMTReplicatorMock } from "@ethers-v6";
import { VerifierHelper } from "@/generated-types/ethers/contracts/ERC1155ETH";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ERC1155ETH test", () => {
  const reverter = new Reverter();

  let USER1: SignerWithAddress;
  let USER2: SignerWithAddress;

  let erc1155eth: ERC1155ETH;

  let query: queryIdentity;
  let state: RegistrationSMTReplicatorMock;

  const MAGIC_ID = 111186066134341633902189494613533900917417361106374681011849132651019822199n;

  before(async () => {
    [USER1, USER2] = await ethers.getSigners();

    query = await zkit.getCircuit("queryIdentity");

    erc1155eth = await ethers.deployContract("ERC1155ETH");

    let proxy = await ethers.deployContract("ERC1967Proxy", [await erc1155eth.getAddress(), "0x"]);
    erc1155eth = await ethers.getContractAt("ERC1155ETH", await proxy.getAddress());

    const verifier = await ethers.deployContract("QueryIdentityProofVerifier");

    state = await ethers.deployContract("RegistrationSMTReplicatorMock");

    await erc1155eth.__ERC1155ETH_init(await verifier.getAddress(), await state.getAddress(), "");

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  function getEventData(receiver: SignerWithAddress, contractAddress: string): bigint {
    const encoder = new ethers.AbiCoder();

    return (
      BigInt(ethers.keccak256(encoder.encode(["address", "address"], [receiver.address, contractAddress]))) &
      0x000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn
    );
  }

  function formatProof(data: Groth16Proof): VerifierHelper.ProofPointsStruct {
    return {
      a: [data.pi_a[0], data.pi_a[1]],
      b: [
        [data.pi_b[0][1], data.pi_b[0][0]],
        [data.pi_b[1][1], data.pi_b[1][0]],
      ],
      c: [data.pi_c[0], data.pi_c[1]],
    };
  }

  describe("mint logic", () => {
    let proof: ProofqueryIdentityGroth16;
    let transitionData: ERC1155ETH.TransitionDataStruct;
    let userData: ERC1155ETH.UserDataStruct;

    before(async () => {
      const inputs = getQueryInputs(
        MAGIC_ID,
        getEventData(USER1, await erc1155eth.getAddress()),
        10n,
        await erc1155eth.initTimestamp(),
      );
      proof = await query.generateProof(inputs);

      transitionData = {
        newRoot: ethers.toBeHex(proof.publicSignals.idStateRoot, 32),
        transitionTimestamp: 0n,
        proof: "0x",
      };
      userData = {
        nullifier: proof.publicSignals.nullifier,
        identityCreationTimestamp: 0n,
        identityCounter: BigInt(inputs.identityCounterUpperbound) - 1n,
      };
    });

    it("should mint token with state transition", async () => {
      await expect(
        erc1155eth.mintWithSimpleRootTransition(
          transitionData,
          MAGIC_ID,
          USER1,
          CURRENT_DATE,
          userData,
          formatProof(proof.proof),
        ),
      )
        .to.emit(erc1155eth, "MagicTokenMinted")
        .withArgs(USER1.address, MAGIC_ID, 1, userData.nullifier);

      expect(await erc1155eth.balanceOf(USER1.address, MAGIC_ID)).to.equal(1);
      expect(await erc1155eth.isNullifierUsed(userData.nullifier)).to.be.true;
    });

    it("should mint token with regular transition", async () => {
      await expect(
        erc1155eth.mintWithRootTransition(
          transitionData,
          MAGIC_ID,
          USER1,
          CURRENT_DATE,
          userData,
          formatProof(proof.proof),
        ),
      )
        .to.emit(erc1155eth, "MagicTokenMinted")
        .withArgs(USER1.address, MAGIC_ID, 1, userData.nullifier);

      expect(await erc1155eth.balanceOf(USER1.address, MAGIC_ID)).to.equal(1);
      expect(await erc1155eth.isNullifierUsed(userData.nullifier)).to.be.true;
    });

    it("should mint token without root transition", async () => {
      await state.transitionRoot(transitionData.newRoot, transitionData.transitionTimestamp, transitionData.proof);

      await expect(
        erc1155eth.mint(transitionData.newRoot, MAGIC_ID, USER1, CURRENT_DATE, userData, formatProof(proof.proof)),
      )
        .to.emit(erc1155eth, "MagicTokenMinted")
        .withArgs(USER1.address, MAGIC_ID, 1, userData.nullifier);

      expect(await erc1155eth.balanceOf(USER1.address, MAGIC_ID)).to.equal(1);
      expect(await erc1155eth.isNullifierUsed(userData.nullifier)).to.be.true;
    });

    it("should revert if root is invalid", async () => {
      await expect(
        erc1155eth.mint(transitionData.newRoot, MAGIC_ID, USER1, CURRENT_DATE, userData, formatProof(proof.proof)),
      )
        .to.be.revertedWithCustomError(erc1155eth, "InvalidRoot")
        .withArgs(transitionData.newRoot);
    });

    it("should revert if nullifier is used", async () => {
      await erc1155eth.mintWithRootTransition(
        transitionData,
        MAGIC_ID,
        USER1,
        CURRENT_DATE,
        userData,
        formatProof(proof.proof),
      );

      await expect(
        erc1155eth.mint(transitionData.newRoot, MAGIC_ID, USER1, CURRENT_DATE, userData, formatProof(proof.proof)),
      )
        .to.be.revertedWithCustomError(erc1155eth, "NullifierUsed")
        .withArgs(userData.nullifier);
    });

    it("should revert if proof is invalid", async () => {
      await expect(
        erc1155eth.mintWithRootTransition(
          transitionData,
          MAGIC_ID,
          USER1,
          CURRENT_DATE + 1n,
          userData,
          formatProof(proof.proof),
        ),
      ).to.be.revertedWithCustomError(erc1155eth, "InvalidProof");
    });

    it("should revert if provided current date is too far away in the past", async () => {
      const now = Date.now();
      await time.setNextBlockTimestamp(now);

      await expect(
        erc1155eth.mintWithRootTransition(
          transitionData,
          MAGIC_ID,
          USER1,
          encodeDate("231209"),
          userData,
          formatProof(proof.proof),
        ),
      )
        .to.be.revertedWithCustomError(erc1155eth, "InvalidCurrentDate")
        .withArgs(encodeDate("231209"), 1702080000n, now);
    });

    it("should revert if receiver already has a token", async () => {
      await erc1155eth.mintWithRootTransition(
        transitionData,
        MAGIC_ID,
        USER1,
        CURRENT_DATE,
        userData,
        formatProof(proof.proof),
      );

      const inputs = getQueryInputs(
        MAGIC_ID,
        getEventData(USER1, await erc1155eth.getAddress()),
        10n,
        await erc1155eth.initTimestamp(),
        125n,
      );
      const proofAttempt2 = await query.generateProof(inputs);

      const transitionDataAttempt2 = {
        newRoot: ethers.toBeHex(proofAttempt2.publicSignals.idStateRoot, 32),
        transitionTimestamp: 0n,
        proof: "0x",
      };
      const userDataAttempt2 = {
        nullifier: proofAttempt2.publicSignals.nullifier,
        identityCreationTimestamp: 0n,
        identityCounter: BigInt(inputs.identityCounterUpperbound) - 1n,
      };

      await expect(
        erc1155eth.mintWithRootTransition(
          transitionDataAttempt2,
          MAGIC_ID,
          USER1,
          CURRENT_DATE,
          userDataAttempt2,
          formatProof(proofAttempt2.proof),
        ),
      )
        .to.be.revertedWithCustomError(erc1155eth, "UserAlreadyRegistered")
        .withArgs(USER1.address);
    });

    it("should revert if trying to transfer token to the another user", async () => {
      await erc1155eth.mintWithRootTransition(
        transitionData,
        MAGIC_ID,
        USER1,
        CURRENT_DATE,
        userData,
        formatProof(proof.proof),
      );

      await expect(
        erc1155eth.safeTransferFrom(USER1.address, USER2.address, MAGIC_ID, 1, "0x"),
      ).to.be.revertedWithCustomError(erc1155eth, "BurnAndTransferAreNotAllowed");
    });
  });

  describe("mint conditions", () => {
    it("should mint token by an account who has multiple registration before the initTimestamp", async () => {
      const inputs = getQueryInputs(
        MAGIC_ID,
        getEventData(USER1, await erc1155eth.getAddress()),
        15n,
        await erc1155eth.initTimestamp(),
      );
      const proof = await query.generateProof(inputs);

      const transitionData = {
        newRoot: ethers.toBeHex(proof.publicSignals.idStateRoot, 32),
        transitionTimestamp: 0n,
        proof: "0x",
      };
      const userData = {
        nullifier: proof.publicSignals.nullifier,
        identityCreationTimestamp: 0n,
        identityCounter: BigInt(inputs.identityCounterUpperbound) - 1n,
      };

      await expect(
        erc1155eth.mintWithRootTransition(
          transitionData,
          MAGIC_ID,
          USER1,
          CURRENT_DATE,
          userData,
          formatProof(proof.proof),
        ),
      ).to.be.fulfilled;
    });

    it("should mint token by an account who has zero registration after the initTimestamp", async () => {
      const proof = await query.generateProof(
        getQueryInputs(
          MAGIC_ID,
          getEventData(USER1, await erc1155eth.getAddress()),
          1n,
          (await erc1155eth.initTimestamp()) + 1n,
        ),
      );

      const transitionData = {
        newRoot: ethers.toBeHex(proof.publicSignals.idStateRoot, 32),
        transitionTimestamp: 0n,
        proof: "0x",
      };
      const userData = {
        nullifier: proof.publicSignals.nullifier,
        identityCreationTimestamp: (await erc1155eth.initTimestamp()) + 1n,
        identityCounter: 0n,
      };

      await erc1155eth.mintWithRootTransition(
        transitionData,
        MAGIC_ID,
        USER1,
        CURRENT_DATE,
        userData,
        formatProof(proof.proof),
      );
    });
  });

  describe("#Contract Management", () => {
    it("should set uri", async () => {
      const uri = "ipfs://ipfs/newuri";

      await erc1155eth.setURI(uri);

      expect(await erc1155eth.uri(0)).to.be.equal(uri);
    });

    it("should revert if trying to set uri by unauthorized account", async () => {
      await expect(erc1155eth.connect(USER2).setURI("ipfs://ipfs/newuri"))
        .to.be.revertedWithCustomError(erc1155eth, "OwnableUnauthorizedAccount")
        .withArgs(USER2.address);
    });

    it("should revert if trying to initialize the contract twice", async () => {
      await expect(erc1155eth.__ERC1155ETH_init(ethers.ZeroAddress, await state.getAddress(), "")).to.be.rejected;
    });

    it("should upgrade the contract by owner", async () => {
      const newContract = await (await ethers.getContractFactory("ERC1155ETH")).deploy();

      await expect(erc1155eth.connect(USER2).upgradeToAndCall(await newContract.getAddress(), "0x"))
        .to.be.revertedWithCustomError(erc1155eth, "OwnableUnauthorizedAccount")
        .withArgs(USER2.address);

      await erc1155eth.connect(USER1).upgradeToAndCall(await newContract.getAddress(), "0x");

      expect(await erc1155eth.implementation()).to.be.equal(await newContract.getAddress());
    });
  });
});
