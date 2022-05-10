import { extendConfig, extendEnvironment } from "hardhat/config"
import { lazyObject } from "hardhat/plugins"
import { HardhatConfig, HardhatUserConfig } from "hardhat/types"
import path from "path"

// import { ExampleHardhatRuntimeEnvironmentField } from "./ExampleHardhatRuntimeEnvironmentField";
import "./type-extensions"

extendConfig(
	(config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
		const thor = userConfig.networks?.thor
		if (thor) {
			config.networks.thor = thor
		} else {
			config.networks.thor = { url: 'Unknown' }
		}
	}
)

// extendEnvironment((hre) => {
// 	// We add a field to the Hardhat Runtime Environment here.
// 	// We use lazyObject to avoid initializing things until they are actually
// 	// needed.
// 	hre.example = lazyObject(() => new ExampleHardhatRuntimeEnvironmentField());
// })
