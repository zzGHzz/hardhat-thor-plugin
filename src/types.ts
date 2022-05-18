import type { ethers } from 'ethers'
import type { Artifact } from 'hardhat/types'
import type { ethers as thorEthers } from 'web3-providers-connex'

export interface Libraries {
	[libraryName: string]: string;
}

export interface FactoryOptions {
	signer?: ethers.providers.JsonRpcSigner;
	libraries?: Libraries;
}

export declare function getContractFactory(
	name: string,
	signerOrOptions?: ethers.providers.JsonRpcSigner | FactoryOptions
): Promise<ethers.ContractFactory>;

export declare function getContractFactory(
	abi: any[],
	bytecode: ethers.utils.BytesLike,
	signer?: ethers.Signer
): Promise<ethers.ContractFactory>;

export interface Helpers {
	provider: ethers.providers.JsonRpcProvider;

	getSigner: (addr: string) => Promise<ethers.providers.JsonRpcSigner>;
	getSigners: () => Promise<ethers.providers.JsonRpcSigner[]>;
	getContractFactory: typeof getContractFactory;
	getContractFactoryFromArtifact: (
		artifact: Artifact,
		signerOrOptions?: ethers.providers.JsonRpcSigner | FactoryOptions
	) => Promise<ethers.ContractFactory>;
	getContractAt: (
		nameOrAbi: string | any[],
		address: string,
		signer?: ethers.providers.JsonRpcSigner
	) => Promise<ethers.Contract>;
	getContractAtFromArtifact: (
		artifact: Artifact,
		address: string,
		signer?: ethers.providers.JsonRpcSigner
	) => Promise<ethers.Contract>;
}

export type EthersPluginT = typeof ethers & Helpers & typeof thorEthers