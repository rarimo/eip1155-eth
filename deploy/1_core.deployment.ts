import { Deployer, Reporter } from "@solarity/hardhat-migrate";

import { ERC1155ETH__factory, ERC1967Proxy__factory, QueryIdentityProofVerifier__factory } from "@ethers-v6";

const MAGIC_TOKEN_ID = 111186066134341633902189494613533900917417361106374681011849132651019822199n;
const STATE_CONTRACT_ADDRESS = "0x10f370A6d8782E0e0E85ba948be6DA2465Aab4E2";

export = async (deployer: Deployer) => {
  let core = await deployer.deploy(ERC1155ETH__factory);
  await deployer.deploy(ERC1967Proxy__factory, [await core.getAddress(), "0x"], { name: "ERC1155ETHProxy" });

  core = await deployer.deployed(ERC1155ETH__factory, "ERC1155ETHProxy");

  const verifier = await deployer.deploy(QueryIdentityProofVerifier__factory);

  await core.__ERC1155ETH_init(
    MAGIC_TOKEN_ID,
    await verifier.getAddress(),
    STATE_CONTRACT_ADDRESS,
    "https://ipfs.io/ipfs/bafkreieb3pzhzfvfrfuobr4vlgj75cb3vrsgcjmnhlhu5jkw4mzrfpuaau",
  );

  await Reporter.reportContractsMD(["ERC1155ETH", await core.getAddress()]);
};
