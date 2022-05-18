import "hardhat/types/config"
import "hardhat/types/runtime"

import { ThorPlugin } from "./thor"
declare module "hardhat/types/config" {
	export type ThorConfig = {
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

declare module "hardhat/types/runtime" {
	export interface HardhatRuntimeEnvironment {
		thor: ThorPlugin;
	}
}
