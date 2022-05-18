import { HardhatUserConfig } from 'hardhat/types'
import { SoloDefault } from 'thor-builtin'
import '../../../src/index'

const config: HardhatUserConfig = {
	solidity: "0.5.0",
	thor: {
		url: 'http://127.0.0.1:8669',
		privateKeys: SoloDefault.privKeys
	}
}

export default config
