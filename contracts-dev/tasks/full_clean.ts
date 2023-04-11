import fs from "fs";
import { task } from "hardhat/internal/core/config/config-env";

task("clean").setAction(async (taskArguments, hre, runSuper) => {
  fs.rmSync("./.openzeppelin", { recursive: true, force: true });
  return runSuper();
});