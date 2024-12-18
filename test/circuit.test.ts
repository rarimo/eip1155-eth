import { expect } from "chai";
import { zkit } from "hardhat";

import { queryIdentity } from "@zkit";

import { createDG1Data, getQueryInputs } from "@helpers";

describe("Query Identity Proof test", () => {
  let query: queryIdentity;

  before(async () => {
    query = await zkit.getCircuit("queryIdentity");
  });

  it("should generate proof", async () => {
    await expect(query.generateProof(getQueryInputs(0n, 0n, 1n, 1n))).to.be.eventually.fulfilled;
  });

  it("should revert if expiration lowerbound is wrong", async () => {
    const dg1WithLowExpDate = createDG1Data({
      citizenship: "ABW",
      name: "Somebody",
      nameResidual: "",
      documentNumber: "",
      expirationDate: "231210",
      birthDate: "221210",
      sex: "M",
      nationality: "ABW",
    });
    const inputs = getQueryInputs(0n, 0n, 1n, 1n, 123n, dg1WithLowExpDate);

    await expect(query.generateProof(inputs)).to.be.eventually.rejectedWith(
      "Error in template QueryIdentity_332 line: 158",
    );
  });
});
