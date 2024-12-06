import { ethers, zkit } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { ERC1155ETH } from "@ethers-v6";

import { Reverter } from "@helpers";

import { queryIdentity } from "@zkit";
import { CURRENT_DATE, getQueryInputs } from "@/test/helpers/query";

import { VerifierHelper } from "@/generated-types/ethers/contracts/ERC1155ETH";
import { Groth16Proof } from "@solarity/zkit";

describe("ERC1155ETH test", () => {
  const reverter = new Reverter();

  let USER1: SignerWithAddress;

  let erc1155eth: ERC1155ETH;

  let query: queryIdentity;

  const MAGIC_ID = 111186066134341633902189494613533900917417361106374681011849132651019822199n;

  before(async () => {
    [USER1] = await ethers.getSigners();

    query = await zkit.getCircuit("queryIdentity");

    erc1155eth = await ethers.deployContract("ERC1155ETH");

    let proxy = await ethers.deployContract("ERC1967Proxy", [await erc1155eth.getAddress(), "0x"]);
    erc1155eth = await ethers.getContractAt("ERC1155ETH", await proxy.getAddress());

    const verifier = await ethers.deployContract("QueryIdentityProofVerifier");

    const state = await ethers.deployContract("RegistrationSMTReplicatorMock");

    await erc1155eth.__ERC1155ETH_init(MAGIC_ID, await verifier.getAddress(), await state.getAddress());

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  function getEventData(receiver: SignerWithAddress): bigint {
    const encoder = new ethers.AbiCoder();

    return (
      BigInt(ethers.keccak256(encoder.encode(["address"], [receiver.address]))) &
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
    it.only("should mint token with state transition", async () => {
      const inputs = getQueryInputs(MAGIC_ID, getEventData(USER1), 1n, await erc1155eth.initTimestamp());
      const proof = await query.generateProof(inputs);

      const transitionData: ERC1155ETH.TransitionDataStruct = {
        newRoot_: ethers.toBeHex(proof.publicSignals.idStateRoot, 32),
        transitionTimestamp_: 0n,
        proof: "0x",
      };
      const userData: ERC1155ETH.UserDataStruct = {
        nullifier: proof.publicSignals.nullifier,
        identityCreationTimestamp: 0n,
        identityCounter: 0n,
      };

      await erc1155eth.mintWithRootTransition(transitionData, USER1, CURRENT_DATE, userData, formatProof(proof.proof));
    });
  });
});
