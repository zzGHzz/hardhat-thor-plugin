import { resetHardhatContext } from "hardhat/plugins-testing"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import path from "path"

// Import this plugin type extensions for the HardhatRuntimeEnvironment
import "../src/type-extensions"

declare module "mocha" {
	interface Context {
		env: HardhatRuntimeEnvironment;
	}
}

export function useEnvironment(
	fixtureProjectName: string,
	networkName = "localhost"
) {
	before("Loading hardhat environment", async function () {
		process.chdir(path.join(__dirname, "fixture-projects", fixtureProjectName))
		process.env.HARDHAT_NETWORK = networkName

		this.env = require("hardhat")

		await this.env.thor.connect()
		if (!this.env.thor.ethers) {
			throw new Error('Failed to initialize ethers')
		}
	});

	after("Resetting hardhat", function () {
		this.env.thor.close()
		resetHardhatContext()
	});
}
