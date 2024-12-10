import { ethers } from "hardhat";

import { Poseidon } from "@iden3/js-crypto";

import { PrivatequeryIdentityGroth16 } from "@zkit";

import { encodeDate } from "@/test/helpers/date";
import { createDG1Data, getDG1Commitment } from "@/test/helpers/dg1";
import { getTreePosition, getTreeValue } from "@/test/helpers/keypair";

export const SELECTOR = 0x1a01n;
export const ZERO_DATE = BigInt(ethers.toBeHex("0x303030303030"));

export const CURRENT_DATE = encodeDate("241209");

const dg1 = createDG1Data({
  citizenship: "ABW",
  name: "Somebody",
  nameResidual: "",
  documentNumber: "",
  expirationDate: "261210",
  birthDate: "221210",
  sex: "M",
  nationality: "ABW",
});

export function getQueryInputs(
  eventId: bigint,
  eventData: bigint,
  identityCounterUpperbound: bigint,
  timestampUpperbound: bigint,
  skIdentity: bigint = 123n,
  dg1Data = dg1,
): PrivatequeryIdentityGroth16 {
  const pkPassportHash = 0n;

  const timestamp = 0n;
  const identityCounter = 0n;

  const dg1Commitment = getDG1Commitment(dg1Data, skIdentity);

  const treePosition = getTreePosition(skIdentity, pkPassportHash);
  const treeValue = getTreeValue(dg1Commitment, identityCounter, timestamp);

  return {
    eventID: eventId,
    eventData,
    idStateRoot: Poseidon.hash([treePosition, treeValue, 1n]),
    selector: SELECTOR,
    currentDate: CURRENT_DATE,
    timestampLowerbound: 0n,
    timestampUpperbound,
    identityCounterLowerbound: 0n,
    identityCounterUpperbound,
    birthDateLowerbound: ZERO_DATE,
    birthDateUpperbound: ZERO_DATE,
    expirationDateLowerbound: encodeDate("241210"),
    expirationDateUpperbound: ZERO_DATE,
    citizenshipMask: 0n,
    skIdentity,
    pkPassportHash,
    dg1: dg1Data,
    idStateSiblings: Array(80).fill(0n),
    timestamp,
    identityCounter,
  };
}
