import hre from "hardhat";

async function main() {
  console.log("Deploying Provenance contract...");

  const Provenance = await hre.ethers.getContractFactory("Provenance");
  const provenance = await Provenance.deploy();

  await provenance.waitForDeployment();

  const address = await provenance.getAddress();
  console.log(`Provenance contract deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
