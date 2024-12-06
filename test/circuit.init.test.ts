import { expect } from "chai";
import { zkit } from "hardhat";

import { queryIdentity } from "@zkit";

import { getQueryInputs } from "@/test/helpers/query";

describe("Query Identity Proof test", () => {
  let query: queryIdentity;

  before(async () => {
    query = await zkit.getCircuit("queryIdentity");
  });

  it("should generate proof", async () => {
    await expect(query.generateProof(getQueryInputs(0n, 0n, 1n, 1n))).to.be.eventually.fulfilled;
  });
});
