import { babyJub, Poseidon } from "@iden3/js-crypto";

export function getPublicFromPrivateKey(privateKey: bigint) {
  return babyJub.mulPointEscalar(babyJub.Base8, privateKey);
}

export function getTreePosition(skIdentity: bigint, pkPassHash: bigint) {
  const babyPbk = getPublicFromPrivateKey(skIdentity);

  return Poseidon.hash([pkPassHash, Poseidon.hash([babyPbk[0], babyPbk[1]])]);
}

export function getTreeValue(dgCommit: bigint, identityCounter: bigint, timestamp: bigint) {
  return Poseidon.hash([dgCommit, identityCounter, timestamp]);
}
