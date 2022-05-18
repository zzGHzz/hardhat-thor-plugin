import "hardhat/types/config"
import "hardhat/types/runtime"
import { ThorPlugin } from "./thor"
declare module "hardhat/types/config" {
	export interface ThorConfig {
		url: string;
		delegate?: string;
		privateKeys?: string[];
	}

	export interface HardhatConfig{
		thor: ThorConfig;
	}
	
	export interface HardhatUserConfig {
		thor?: ThorConfig;
	}
}

declare module "hardhat/types/runtime" {
	export interface HardhatRuntimeEnvironment {
		thor: ThorPlugin;
	}
}
