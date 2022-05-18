import { HardhatUserConfig } from 'hardhat/types'
import { SoloDefault } from 'thor-builtin'
import '../../../src/index'

const thorConfig = {
	url: 'http://127.0.0.1:8669',
	privateKeys: SoloDefault.privKeys
}

const config: HardhatUserConfig = {
	solidity: "0.5.0",
	networks: {
		thor: thorConfig
	}
}

export default config
