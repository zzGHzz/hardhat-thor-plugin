import { extendConfig, extendEnvironment } from "hardhat/config"
import { HardhatPluginError } from "hardhat/plugins"
import { HardhatConfig, HardhatUserConfig } from "hardhat/types"
import "./type-extensions"
import { ThorPlugin } from "./thor"

const pluginName = 'hardhat-thor'

extendConfig(
	(config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
		const thor = userConfig.networks?.thor
		if (thor) {
			config.networks.thor = {
				url: thor.url,
				privateKeys: thor.privateKeys?.map(x => x),
				delegate: thor.delegate
			}
		} else {
			throw new HardhatPluginError(pluginName, 'Thor network config not found')
		}
	}
)

extendEnvironment((hre) => {
	hre.thor = new ThorPlugin(hre)
})
