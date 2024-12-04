import { zkit } from "hardhat";

describe("Circuit init test", () => {
  it("test", async () => {
    const circuit = await zkit.getCircuit("queryIdentity");

    console.log(await circuit.generateProof({}));
  });
});
