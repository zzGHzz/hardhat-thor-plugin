import { HardhatUserConfig } from "hardhat/types"
import "../../../src/index"

const config: HardhatUserConfig = {
	networks: {
		thor: {
			url: "https://test.net"
		}
	}
}

export default config
