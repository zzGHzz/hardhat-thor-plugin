import "hardhat/types/config"
import "hardhat/types/runtime"

// import { ExampleHardhatRuntimeEnvironmentField } from "./ExampleHardhatRuntimeEnvironmentField";

declare module "hardhat/types/config" {
	type ThorConfig = {
		url: string;
		delegate?: string;
		privateKeys?: string[];
	}

	export interface NetworksConfig {
		thor: ThorConfig;
	}
	export interface NetworksUserConfig {
		thor?: ThorConfig;
	}
}

// declare module "hardhat/types/runtime" {
// 	// This is an example of an extension to the Hardhat Runtime Environment.
// 	// This new field will be available in tasks' actions, scripts, and tests.
// 	export interface HardhatRuntimeEnvironment {
// 		example: ExampleHardhatRuntimeEnvironmentField;
// 	}
// }
