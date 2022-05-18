import type { ethers } from "ethers";
import type { FactoryOptions, Libraries } from "./types";
import { HardhatPluginError } from "hardhat/plugins";
import {
	Artifact,
	HardhatRuntimeEnvironment
} from "hardhat/types";
import type ThorT from 'web3-providers-connex'

interface Link {
	sourceName: string;
	libraryName: string;
	address: string;
}

const pluginName = "hardhat-thor"

function isArtifact(artifact: any): artifact is Artifact {
	const {
		contractName,
		sourceName,
		abi,
		bytecode,
		deployedBytecode,
		linkReferences,
		deployedLinkReferences,
	} = artifact;

	return (
		typeof contractName === "string" &&
		typeof sourceName === "string" &&
		Array.isArray(abi) &&
		typeof bytecode === "string" &&
		typeof deployedBytecode === "string" &&
		linkReferences !== undefined &&
		deployedLinkReferences !== undefined
	);
}

export async function getSigners(
	provider: ethers.providers.JsonRpcProvider
): Promise<ethers.providers.JsonRpcSigner[]> {
	const accounts = await provider.listAccounts();

	const signers = await Promise.all(
		accounts.map((account) => getSigner(provider, account))
	);

	return signers;
}

export async function getSigner(
	provider: ethers.providers.JsonRpcProvider,
	address: string
): Promise<ethers.providers.JsonRpcSigner> {
	return provider.getSigner(address);
}

export function getContractFactory(
	hre: HardhatRuntimeEnvironment,
	provider: ethers.providers.JsonRpcProvider,
	name: string,
	signerOrOptions?: ethers.providers.JsonRpcSigner | FactoryOptions
): Promise<ethers.ContractFactory>;

export function getContractFactory(
	hre: HardhatRuntimeEnvironment,
	provider: ethers.providers.JsonRpcProvider,
	abi: any[],
	bytecode: ethers.utils.BytesLike,
	signer?: ethers.providers.JsonRpcSigner
): Promise<ethers.ContractFactory>;

export async function getContractFactory(
	hre: HardhatRuntimeEnvironment,
	provider: ethers.providers.JsonRpcProvider,
	nameOrAbi: string | any[],
	bytecodeOrFactoryOptions?:
		| (ethers.providers.JsonRpcSigner | FactoryOptions)
		| ethers.utils.BytesLike,
	signer?: ethers.providers.JsonRpcSigner
) {
	if (typeof nameOrAbi === "string") {
		const artifact = await hre.artifacts.readArtifact(nameOrAbi);

		return getContractFactoryFromArtifact(
			hre,
			provider,
			artifact,
			bytecodeOrFactoryOptions as ethers.providers.JsonRpcSigner | FactoryOptions | undefined
		);
	}

	return getContractFactoryByAbiAndBytecode(
		hre,
		provider,
		nameOrAbi,
		bytecodeOrFactoryOptions as ethers.utils.BytesLike,
		signer
	);
}

function isFactoryOptions(
	signerOrOptions?: ethers.providers.JsonRpcSigner | FactoryOptions
): signerOrOptions is FactoryOptions {
	const { Signer } = require("ethers") as typeof ethers;
	if (signerOrOptions === undefined || signerOrOptions instanceof Signer) {
		return false;
	}

	return true;
}

export async function getContractFactoryFromArtifact(
	hre: HardhatRuntimeEnvironment,
	provider: ethers.providers.JsonRpcProvider,
	artifact: Artifact,
	signerOrOptions?: ethers.providers.JsonRpcSigner | FactoryOptions
) {
	let libraries: Libraries = {};
	let signer: ethers.providers.JsonRpcSigner | undefined;

	if (!isArtifact(artifact)) {
		throw new HardhatPluginError(
			pluginName,
			`You are trying to create a contract factory from an artifact, but you have not passed a valid artifact parameter.`
		);
	}

	if (isFactoryOptions(signerOrOptions)) {
		signer = signerOrOptions.signer;
		libraries = signerOrOptions.libraries ?? {};
	} else {
		signer = signerOrOptions;
	}

	if (artifact.bytecode === "0x") {
		throw new HardhatPluginError(
			pluginName,
			`You are trying to create a contract factory for the contract ${artifact.contractName}, which is abstract and can't be deployed.
If you want to call a contract using ${artifact.contractName} as its interface use the "getContractAt" function instead.`
		);
	}

	const linkedBytecode = await collectLibrariesAndLink(artifact, libraries);

	return getContractFactoryByAbiAndBytecode(
		hre,
		provider,
		artifact.abi,
		linkedBytecode,
		signer
	);
}

async function collectLibrariesAndLink(
	artifact: Artifact,
	libraries: Libraries
) {
	const { utils } = require("ethers") as typeof ethers;

	const neededLibraries: Array<{
		sourceName: string;
		libName: string;
	}> = [];
	for (const [sourceName, sourceLibraries] of Object.entries(
		artifact.linkReferences
	)) {
		for (const libName of Object.keys(sourceLibraries)) {
			neededLibraries.push({ sourceName, libName });
		}
	}

	const linksToApply: Map<string, Link> = new Map();
	for (const [linkedLibraryName, linkedLibraryAddress] of Object.entries(
		libraries
	)) {
		if (!utils.isAddress(linkedLibraryAddress)) {
			throw new HardhatPluginError(
				pluginName,
				`You tried to link the contract ${artifact.contractName} with the library ${linkedLibraryName}, but provided this invalid address: ${linkedLibraryAddress}`
			);
		}

		const matchingNeededLibraries = neededLibraries.filter((lib) => {
			return (
				lib.libName === linkedLibraryName ||
				`${lib.sourceName}:${lib.libName}` === linkedLibraryName
			);
		});

		if (matchingNeededLibraries.length === 0) {
			let detailedMessage: string;
			if (neededLibraries.length > 0) {
				const libraryFQNames = neededLibraries
					.map((lib) => `${lib.sourceName}:${lib.libName}`)
					.map((x) => `* ${x}`)
					.join("\n");
				detailedMessage = `The libraries needed are:
${libraryFQNames}`;
			} else {
				detailedMessage = "This contract doesn't need linking any libraries.";
			}
			throw new HardhatPluginError(
				pluginName,
				`You tried to link the contract ${artifact.contractName} with ${linkedLibraryName}, which is not one of its libraries.
${detailedMessage}`
			);
		}

		if (matchingNeededLibraries.length > 1) {
			const matchingNeededLibrariesFQNs = matchingNeededLibraries
				.map(({ sourceName, libName }) => `${sourceName}:${libName}`)
				.map((x) => `* ${x}`)
				.join("\n");
			throw new HardhatPluginError(
				pluginName,
				`The library name ${linkedLibraryName} is ambiguous for the contract ${artifact.contractName}.
It may resolve to one of the following libraries:
${matchingNeededLibrariesFQNs}

To fix this, choose one of these fully qualified library names and replace where appropriate.`
			);
		}

		const [neededLibrary] = matchingNeededLibraries;

		const neededLibraryFQN = `${neededLibrary.sourceName}:${neededLibrary.libName}`;

		// The only way for this library to be already mapped is
		// for it to be given twice in the libraries user input:
		// once as a library name and another as a fully qualified library name.
		if (linksToApply.has(neededLibraryFQN)) {
			throw new HardhatPluginError(
				pluginName,
				`The library names ${neededLibrary.libName} and ${neededLibraryFQN} refer to the same library and were given as two separate library links.
Remove one of them and review your library links before proceeding.`
			);
		}

		linksToApply.set(neededLibraryFQN, {
			sourceName: neededLibrary.sourceName,
			libraryName: neededLibrary.libName,
			address: linkedLibraryAddress,
		});
	}

	if (linksToApply.size < neededLibraries.length) {
		const missingLibraries = neededLibraries
			.map((lib) => `${lib.sourceName}:${lib.libName}`)
			.filter((libFQName) => !linksToApply.has(libFQName))
			.map((x) => `* ${x}`)
			.join("\n");

		throw new HardhatPluginError(
			pluginName,
			`The contract ${artifact.contractName} is missing links for the following libraries:
${missingLibraries}

Learn more about linking contracts at https://hardhat.org/plugins/nomiclabs-hardhat-ethers.html#library-linking
`
		);
	}

	return linkBytecode(artifact, [...linksToApply.values()]);
}

async function getContractFactoryByAbiAndBytecode(
	hre: HardhatRuntimeEnvironment,
	provider: ethers.providers.JsonRpcProvider,
	abi: any[],
	bytecode: ethers.utils.BytesLike,
	signer?: ethers.providers.JsonRpcSigner
) {
	const { ContractFactory } = require("ethers") as typeof ethers;
	const thor = require('web3-providers-connex') as typeof ThorT

	if (signer === undefined) {
		const signers = await getSigners(provider);
		signer = signers[0];
	}

	return thor.ethers.modifyFactory(new ContractFactory(abi, bytecode, signer));
}

export async function getContractAt(
	hre: HardhatRuntimeEnvironment,
	provider: ethers.providers.JsonRpcProvider,
	nameOrAbi: string | any[],
	address: string,
	signer?: ethers.providers.JsonRpcSigner
) {
	if (typeof nameOrAbi === "string") {
		const artifact = await hre.artifacts.readArtifact(nameOrAbi);

		return getContractAtFromArtifact(hre, provider, artifact, address, signer);
	}

	const { Contract } = require("ethers") as typeof ethers;

	if (signer === undefined) {
		const signers = await getSigners(provider);
		signer = signers[0];
	}

	// // If there's no signer, we want to put the provider for the selected network here.
	// // This allows read only operations on the contract interface.
	const signerOrProvider: ethers.providers.JsonRpcSigner | ethers.providers.Provider =
		signer !== undefined ? signer : provider;

	// const abiWithAddedGas = addGasToAbiMethodsIfNecessary(
	// 	hre.network.config,
	// 	nameOrAbi
	// );

	return new Contract(address, nameOrAbi, signerOrProvider);
}

export async function getContractAtFromArtifact(
	hre: HardhatRuntimeEnvironment,
	provider: ethers.providers.JsonRpcProvider,
	artifact: Artifact,
	address: string,
	signer?: ethers.providers.JsonRpcSigner
) {
	if (!isArtifact(artifact)) {
		throw new HardhatPluginError(
			pluginName,
			`You are trying to create a contract by artifact, but you have not passed a valid artifact parameter.`
		);
	}

	const factory = await getContractFactoryByAbiAndBytecode(
		hre,
		provider,
		artifact.abi,
		"0x",
		signer
	);

	let contract = factory.attach(address);
	// If there's no signer, we connect the contract instance to the provider for the selected network.
	if (contract.provider === null) {
		contract = contract.connect(provider);
	}

	return contract;
}

function linkBytecode(artifact: Artifact, libraries: Link[]): string {
	let bytecode = artifact.bytecode;

	// TODO: measure performance impact
	for (const { sourceName, libraryName, address } of libraries) {
		const linkReferences = artifact.linkReferences[sourceName][libraryName];
		for (const { start, length } of linkReferences) {
			bytecode =
				bytecode.substring(0, 2 + start * 2) +
				address.substring(2) +
				bytecode.substring(2 + (start + length) * 2);
		}
	}

	return bytecode;
}
