import assert from "node:assert";
import { ethers, zkit } from "hardhat";

import { Hash, LocalStorageDB, Merkletree, Proof, str2Bytes, verifyProof } from "@iden3/js-merkletree";

import { PrivatequeryIdentityGroth16, queryIdentity } from "@zkit";

import { encodeDate } from "@/test/helpers/date";
import { createDG1Data, getDG1Commitment } from "@/test/helpers/dg1";

import "mock-local-storage";
import { getPublicFromPrivateKey, getTreePosition, getTreeValue } from "@/test/helpers/keypair";

describe("Circuit init test", () => {
  let query: queryIdentity;

  let localMerkleTree: Merkletree;
  let storage: LocalStorageDB;

  const ZERO_DATE = BigInt(ethers.toBeHex("0x303030303030"));

  async function getRoot(tree: Merkletree): Promise<string> {
    return ethers.toBeHex((await tree.root()).bigInt(), 32);
  }

  async function getProof(tree: Merkletree, leaf: bigint): Promise<bigint[]> {
    const data = await tree.generateProof(leaf);
    assert(data.proof.existence, "Invalid proof existence");

    const siblings = Array(80).fill(0n);
    const unprocessedSiblings = data.proof.allSiblings();
    for (let i = 0; i < unprocessedSiblings.length; i++) {
      siblings[i] = ethers.hexlify(unprocessedSiblings[i].bytes);
    }

    return siblings;
  }

  before(async () => {
    query = await zkit.getCircuit("queryIdentity");
  });

  beforeEach("setup", async () => {
    storage = new LocalStorageDB(str2Bytes(""));

    localMerkleTree = new Merkletree(storage, true, 80);
  });

  afterEach("cleanup", async () => {
    localStorage.clear();
  });

  it.only("test", async () => {
    const dg1 = createDG1Data({
      citizenship: "ABW",
      name: "Somebody",
      nameResidual: "Kek",
      documentNumber: "",
      expirationDate: "261210",
      birthDate: "221210",
      sex: "M",
      nationality: "ABW",
    });

    const skIdentity = 123n;
    const pkPassportHash = 0n;

    const timestamp = 0n;
    const identityCounter = 0n;

    const dg1Commitment = getDG1Commitment(dg1, skIdentity);

    const treePosition = getTreePosition(skIdentity, pkPassportHash);
    const treeValue = getTreeValue(dg1Commitment, identityCounter, timestamp);

    await localMerkleTree.add(treePosition, treeValue);

    const idStateRoot = await getRoot(localMerkleTree);
    const siblings = await getProof(localMerkleTree, treePosition);

    const inputs: PrivatequeryIdentityGroth16 = {
      eventID: 0n,
      eventData: 0n,
      idStateRoot: BigInt(idStateRoot),
      selector: 0n,
      currentDate: encodeDate("202410"),
      timestampLowerbound: 0n,
      timestampUpperbound: 0n,
      identityCounterLowerbound: 0n,
      identityCounterUpperbound: 0n,
      birthDateLowerbound: encodeDate("202212"),
      birthDateUpperbound: encodeDate("202412"),
      expirationDateLowerbound: encodeDate("202212"),
      expirationDateUpperbound: encodeDate("202412"),
      citizenshipMask: 0n,
      skIdentity,
      pkPassportHash,
      dg1,
      idStateSiblings: siblings,
      timestamp,
      identityCounter,
    };

    const proof = await query.generateProof(inputs);
    console.log(proof);
  });
});
