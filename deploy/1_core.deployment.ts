import { Deployer, Reporter } from "@solarity/hardhat-migrate";

import { ERC1155ETH__factory, ERC1967Proxy__factory, QueryIdentityProofVerifier__factory } from "@ethers-v6";

const STATE_CONTRACT_ADDRESS = "0xdb0f275caB3d93C19aCd1e16B4f3827d04eB4aE5";

export = async (deployer: Deployer) => {
  let core = await deployer.deploy(ERC1155ETH__factory);
  await deployer.deploy(ERC1967Proxy__factory, [await core.getAddress(), "0x"], { name: "ERC1155ETHProxy" });

  core = await deployer.deployed(ERC1155ETH__factory, "ERC1155ETHProxy");

  const verifier = await deployer.deploy(QueryIdentityProofVerifier__factory);

  await core.__ERC1155ETH_init(
    await verifier.getAddress(),
    STATE_CONTRACT_ADDRESS,
    "ipfs://ipfs/bafkreiepvwsxf6pqc6fbma546oxqzdt2ashkmnjmcvw3gppmyooyyejpkq",
  );

  await Reporter.reportContractsMD(["ERC1155ETH", await core.getAddress()]);
};
