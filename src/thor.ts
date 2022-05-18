import { SimpleNet, SimpleWallet, Driver, Wallet, Net } from '@vechain/connex-driver'
import { Framework } from '@vechain/connex-framework'
import * as thor from 'web3-providers-connex'
import { ethers } from 'ethers'
import { HardhatRuntimeEnvironment, ThorConfig } from 'hardhat/types'
import { HardhatPluginError } from 'hardhat/plugins'
import {
	getContractAt,
	getContractAtFromArtifact,
	getContractFactory,
	getContractFactoryFromArtifact,
	getSigner,
	getSigners,
} from "./helpers";
import { EthersPluginT } from './types'

const pluginName = "hardhat-thor"

type JsonRpcProvider = ethers.providers.JsonRpcProvider

const registerCustomInspection = (BigNumber: any) => {
	const inspectCustomSymbol = Symbol.for("nodejs.util.inspect.custom");

	BigNumber.prototype[inspectCustomSymbol] = function () {
		return `BigNumber { value: "${this.toString()}" }`;
	};
};

export class ThorPlugin {
	private readonly cfg: ThorConfig
	private readonly hre: HardhatRuntimeEnvironment
	private provider?: JsonRpcProvider
	private driver?: Driver

	constructor(hre: HardhatRuntimeEnvironment) {
		this.hre = hre
		const cfg = hre.config.networks.thor
		if (!cfg) {
			throw new HardhatPluginError(
				pluginName,
				'Thor network config not found'
			)
		}
		this.cfg = cfg
	}

	connect = async () => {
		const wallet = new SimpleWallet()
		const pks = this.cfg.privateKeys
		if (pks && pks.length > 0) {
			pks.forEach(pk => { wallet.import(pk) })
		}
		const net = new SimpleNet(this.cfg.url)
		try {
			this.driver = await Driver.connect(net, wallet);
		} catch (err: any) {
			throw new HardhatPluginError(
				pluginName,
				`Cannot connect to the Thor node using url: ${this.cfg.url}`,
				err
			)
		}
		const connex = new Framework(this.driver)

		this.provider = thor.ethers.modifyProvider(
			new ethers.providers.Web3Provider(
				new thor.ConnexProvider({
					connex: connex,
					net: net, 
					wallet: wallet
				})
			)
		)
	}

	close = () => {
		if (this.driver) {
			this.driver.close()
		}
	}

	public get ethers(): EthersPluginT | undefined {
		if (!this.provider) { return }

		registerCustomInspection(ethers.BigNumber)

		return {
			...ethers,

			// Defined in Helpers
			provider: this.provider,
			getSigner: (address: string) => getSigner(<JsonRpcProvider>this.provider, address),
			getSigners: () => getSigners(<JsonRpcProvider>this.provider),
			getContractFactory: getContractFactory.bind(null, this.hre, this.provider) as any,
			getContractFactoryFromArtifact: getContractFactoryFromArtifact.bind(null, this.hre, this.provider),
			getContractAt: getContractAt.bind(null, this.hre, this.provider),
			getContractAtFromArtifact: getContractAtFromArtifact.bind(null, this.hre, this.provider),

			...thor.ethers
		}
	}
}