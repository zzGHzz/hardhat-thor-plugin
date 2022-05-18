import util from "util"
import { assert, expect } from "chai"
import { ethers } from "ethers"
import { HardhatPluginError } from "hardhat/plugins"
import { Artifact } from "hardhat/types"
import { useEnvironment } from "./helpers"
import { SoloDefault } from "thor-builtin"
import '../src/type-extensions'

describe("hardhat-thor plugin", function () {
	describe("thor-solo", function () {
		useEnvironment("hardhat-project")
		describe("HRE extensions", function () {
			it("should extend hardhat runtime environment", function () {
				assert.isDefined(this.env.thor.ethers)
				assert.containsAllKeys(this.env.thor.ethers, [
					"provider",
					"getSigners",
					"getContractFactory",
					"getContractAt",
					...Object.keys(ethers),
				])
			})

			describe("Custom formatters", function () {
				const assertBigNumberFormat = function (
					BigNumber: any,
					value: string | number,
					expected: string
				) {
					const actual = util.format("%o", BigNumber.from(value))
					assert.equal(actual, expected)
				}

				describe("BigNumber", function () {
					it("should format zero unaltered", function () {
						assertBigNumberFormat(
							this.env.thor.ethers!.BigNumber,
							0,
							'BigNumber { value: "0" }'
						)
					})

					it("should provide human readable versions of positive integers", function () {
						const BigNumber = this.env.thor.ethers!.BigNumber

						assertBigNumberFormat(BigNumber, 1, 'BigNumber { value: "1" }')
						assertBigNumberFormat(BigNumber, 999, 'BigNumber { value: "999" }')
						assertBigNumberFormat(
							BigNumber,
							1000,
							'BigNumber { value: "1000" }'
						)
						assertBigNumberFormat(
							BigNumber,
							999999,
							'BigNumber { value: "999999" }'
						)
						assertBigNumberFormat(
							BigNumber,
							1000000,
							'BigNumber { value: "1000000" }'
						)
						assertBigNumberFormat(
							BigNumber,
							"999999999999999999292",
							'BigNumber { value: "999999999999999999292" }'
						)
					})

					it("should provide human readable versions of negative integers", function () {
						const BigNumber = this.env.thor.ethers!.BigNumber

						assertBigNumberFormat(BigNumber, -1, 'BigNumber { value: "-1" }')
						assertBigNumberFormat(
							BigNumber,
							-999,
							'BigNumber { value: "-999" }'
						)
						assertBigNumberFormat(
							BigNumber,
							-1000,
							'BigNumber { value: "-1000" }'
						)
						assertBigNumberFormat(
							BigNumber,
							-999999,
							'BigNumber { value: "-999999" }'
						)
						assertBigNumberFormat(
							BigNumber,
							-1000000,
							'BigNumber { value: "-1000000" }'
						)
						assertBigNumberFormat(
							BigNumber,
							"-999999999999999999292",
							'BigNumber { value: "-999999999999999999292" }'
						)
					})
				})
			})
		})

		describe("Provider", function () {
			it("the provider should handle requests", async function () {
				const accounts: string[] = await this.env.thor.ethers!.provider.send(
					"eth_accounts",
					[]
				)

				const expected = SoloDefault.accounts

				accounts.forEach(addr => expect(expected.indexOf(addr)).to.be.above(-1))
			})
		})

		describe("Signers and contracts helpers", function () {
			let signers: ethers.providers.JsonRpcSigner[]
			let greeterArtifact: Artifact
			let iGreeterArtifact: Artifact

			beforeEach(async function () {
				signers = await this.env.thor.ethers!.getSigners()
				await this.env.run("compile", { quiet: true })
				greeterArtifact = await this.env.artifacts.readArtifact("Greeter")
				iGreeterArtifact = await this.env.artifacts.readArtifact("IGreeter")
			})

			describe("getSigners", function () {
				it("should return the signers", async function () {
					const sigs = await this.env.thor.ethers!.getSigners()
					assert.equal(
						(await sigs[0].getAddress()).toLowerCase(),
						SoloDefault.accounts[0].toLowerCase()
					)
				})
			})

			describe("signer", function () {
				it("should return the balance of the account", async function () {
					const [sig] = await this.env.thor.ethers!.getSigners()
					assert.equal(
						(await sig.getBalance()).toString(),
						"1000000000000000000000000000"
					)
				})

				it("should return the transaction count of the account", async function () {
					const [sig] = await this.env.thor.ethers!.getSigners()
					assert.equal((await sig.getTransactionCount()).toString(), "0")
				})

				it("should allow to use the estimateGas method", async function () {
					const [sig] = await this.env.thor.ethers!.getSigners()

					const Greeter = await this.env.thor.ethers!.getContractFactory("Greeter")
					const tx = Greeter.getDeployTransaction()

					const result = await sig.estimateGas(tx)

					assert.isTrue(result.gt(0))
				})

				it("should allow to use the call method", async function () {
					const [sig] = await this.env.thor.ethers!.getSigners()

					const Greeter = await this.env.thor.ethers!.getContractFactory("Greeter")
					const tx = Greeter.getDeployTransaction()

					const result = await sig.call(tx)

					assert.isString(result)
				})

				it("should send a transaction", async function () {
					const [sig] = await this.env.thor.ethers!.getSigners()

					const Greeter = await this.env.thor.ethers!.getContractFactory("Greeter")
					const tx = Greeter.getDeployTransaction()

					const response = await sig.sendTransaction(tx)

					const receipt = await response.wait()

					assert.equal(receipt.status, 1)
				})

				it("should get the chainId", async function () {
					const [sig] = await this.env.thor.ethers!.getSigners()

					const chainId = await sig.getChainId()

					assert.equal(chainId, 246)
				})

				it("should check and populate a transaction", async function () {
					const [sig] = await this.env.thor.ethers!.getSigners()
					const addr = await sig.getAddress()

					const Greeter = await this.env.thor.ethers!.getContractFactory("Greeter")
					const tx = Greeter.getDeployTransaction()

					const checkedTransaction = sig.checkTransaction(tx)

					assert.equal(await checkedTransaction.from, addr)

					const populatedTransaction = await sig.populateTransaction(
						checkedTransaction
					)

					assert.equal(populatedTransaction.from, addr)
				})
			})

			describe("getContractFactory", function () {
				describe("By name", function () {
					it("should return a contract factory", async function () {
						// It's already compiled in artifacts/
						const contract = await this.env.thor.ethers!.getContractFactory(
							"Greeter"
						)

						assert.containsAllKeys(contract.interface.functions, [
							"setGreeting(string)",
							"greet()",
						])

						assert.equal(
							await contract.signer.getAddress(),
							await signers[0].getAddress()
						)
					})

					it("should fail to return a contract factory for an interface", async function () {
						try {
							await this.env.thor.ethers!.getContractFactory("IGreeter")
						} catch (reason: any) {
							assert.instanceOf(
								reason,
								HardhatPluginError,
								"getContractFactory should fail with a hardhat plugin error"
							)
							assert.isTrue(
								reason.message.includes("is abstract and can't be deployed"),
								"getContractFactory should report the abstract contract as the cause"
							)
							return
						}

						// The test shouldn't reach this point.
						assert.fail(
							"getContractFactory should fail with an abstract contract"
						)
					})

					it("should link a library", async function () {
						const libraryFactory = await this.env.thor.ethers!.getContractFactory(
							"TestLibrary"
						)
						const library = await libraryFactory.deploy()

						const contractFactory = await this.env.thor.ethers!.getContractFactory(
							"TestContractLib",
							{ libraries: { TestLibrary: library.address } }
						)
						assert.equal(
							await contractFactory.signer.getAddress(),
							await signers[0].getAddress()
						)
						const numberPrinter = await contractFactory.deploy()
						const someNumber = 50
						assert.equal(
							await numberPrinter.callStatic.printNumber(someNumber),
							someNumber * 2
						)
					})

					it("should fail to link when passing in an ambiguous library link", async function () {
						const libraryFactory = await this.env.thor.ethers!.getContractFactory(
							"contracts/TestContractLib.sol:TestLibrary"
						)
						const library = await libraryFactory.deploy()

						try {
							await this.env.thor.ethers!.getContractFactory("TestContractLib", {
								libraries: {
									TestLibrary: library.address,
									"contracts/TestContractLib.sol:TestLibrary": library.address,
								},
							})
						} catch (reason: any) {
							assert.instanceOf(
								reason,
								HardhatPluginError,
								"getContractFactory should fail with a hardhat plugin error"
							)
							assert.isTrue(
								reason.message.includes(
									"refer to the same library and were given as two separate library links"
								),
								"getContractFactory should report the ambiguous link as the cause"
							)
							assert.isTrue(
								reason.message.includes(
									"TestLibrary and contracts/TestContractLib.sol:TestLibrary"
								),
								"getContractFactory should display the ambiguous library links"
							)
							return
						}

						// The test shouldn't reach this point
						assert.fail(
							"getContractFactory should fail when the link for one library is ambiguous"
						)
					})

					it("should link a library even if there's an identically named library in the project", async function () {
						const libraryFactory = await this.env.thor.ethers!.getContractFactory(
							"contracts/TestNonUniqueLib.sol:NonUniqueLibrary"
						)
						const library = await libraryFactory.deploy()

						const contractFactory = await this.env.thor.ethers!.getContractFactory(
							"TestNonUniqueLib",
							{ libraries: { NonUniqueLibrary: library.address } }
						)
						assert.equal(
							await contractFactory.signer.getAddress(),
							await signers[0].getAddress()
						)
					})

					it("should fail to link an ambiguous library", async function () {
						const libraryFactory = await this.env.thor.ethers!.getContractFactory(
							"contracts/AmbiguousLibrary.sol:AmbiguousLibrary"
						)
						const library = await libraryFactory.deploy()
						const library2Factory = await this.env.thor.ethers!.getContractFactory(
							"contracts/AmbiguousLibrary2.sol:AmbiguousLibrary"
						)
						const library2 = await library2Factory.deploy()

						try {
							await this.env.thor.ethers!.getContractFactory("TestAmbiguousLib", {
								libraries: {
									AmbiguousLibrary: library.address,
									"contracts/AmbiguousLibrary2.sol:AmbiguousLibrary":
										library2.address,
								},
							})
						} catch (reason: any) {
							assert.instanceOf(
								reason,
								HardhatPluginError,
								"getContractFactory should fail with a hardhat plugin error"
							)
							assert.isTrue(
								reason.message.includes("is ambiguous for the contract"),
								"getContractFactory should report the ambiguous name resolution as the cause"
							)
							assert.isTrue(
								reason.message.includes(
									"AmbiguousLibrary.sol:AmbiguousLibrary"
								) &&
								reason.message.includes(
									"AmbiguousLibrary2.sol:AmbiguousLibrary"
								),
								"getContractFactory should enumerate both available library name candidates"
							)
							return
						}

						// The test shouldn't reach this point
						assert.fail(
							"getContractFactory should fail to retrieve an ambiguous library name"
						)
					})

					it("should fail to create a contract factory with missing libraries", async function () {
						try {
							await this.env.thor.ethers!.getContractFactory("TestContractLib")
						} catch (reason: any) {
							assert.instanceOf(
								reason,
								HardhatPluginError,
								"getContractFactory should fail with a hardhat plugin error"
							)
							assert.isTrue(
								reason.message.includes(
									"missing links for the following libraries"
								),
								"getContractFactory should report the missing libraries as the cause"
							)
							assert.isTrue(
								reason.message.includes("TestContractLib.sol:TestLibrary"),
								"getContractFactory should enumerate missing library names"
							)
							return
						}

						// The test shouldn't reach this point
						assert.fail(
							"getContractFactory should fail to create a contract factory if there are missing libraries"
						)
					})

					it("should fail to create a contract factory with an invalid address", async function () {
						const notAnAddress = "definitely not an address"
						try {
							await this.env.thor.ethers!.getContractFactory("TestContractLib", {
								libraries: { TestLibrary: notAnAddress },
							})
						} catch (reason: any) {
							assert.instanceOf(
								reason,
								HardhatPluginError,
								"getContractFactory should fail with a hardhat plugin error"
							)
							assert.isTrue(
								reason.message.includes("invalid address"),
								"getContractFactory should report the invalid address as the cause"
							)
							assert.isTrue(
								reason.message.includes(notAnAddress),
								"getContractFactory should display the invalid address"
							)
							return
						}

						// The test shouldn't reach this point
						assert.fail(
							"getContractFactory should fail to create a contract factory if there is an invalid address"
						)
					})

					it("should fail to create a contract factory when incorrectly linking a library with an ethers.Contract", async function () {
						const libraryFactory = await this.env.thor.ethers!.getContractFactory(
							"TestLibrary"
						)
						const library = await libraryFactory.deploy()

						try {
							await this.env.thor.ethers!.getContractFactory("TestContractLib", {
								libraries: { TestLibrary: library as any },
							})
						} catch (reason: any) {
							assert.instanceOf(
								reason,
								HardhatPluginError,
								"getContractFactory should fail with a hardhat plugin error"
							)
							assert.isTrue(
								reason.message.includes(
									"invalid address",
									"getContractFactory should report the invalid address as the cause"
								)
							)
							// This assert is here just to make sure we don't end up printing an enormous object
							// in the error message. This may happen if the argument received is particularly complex.
							assert.isTrue(
								reason.message.length <= 400,
								"getContractFactory should fail with an error message that isn't too large"
							)
							return
						}

						assert.fail(
							"getContractFactory should fail to create a contract factory if there is an invalid address"
						)
					})

					it("Should be able to send txs and make calls", async function () {
						const Greeter = await this.env.thor.ethers!.getContractFactory("Greeter")
						const greeter = await Greeter.deploy()

						assert.equal(await greeter.functions.greet(), "Hi")
						await greeter.functions.setGreeting("Hola")
						assert.equal(await greeter.functions.greet(), "Hola")
					})

					describe("with custom signer", function () {
						it("should return a contract factory connected to the custom signer", async function () {
							// It's already compiled in artifacts/
							const contract = await this.env.thor.ethers!.getContractFactory(
								"Greeter",
								signers[1]
							)

							assert.containsAllKeys(contract.interface.functions, [
								"setGreeting(string)",
								"greet()",
							])

							assert.equal(
								await contract.signer.getAddress(),
								await signers[1].getAddress()
							)
						})
					})
				})

				describe("by abi and bytecode", function () {
					it("should return a contract factory", async function () {
						// It's already compiled in artifacts/
						const contract = await this.env.thor.ethers!.getContractFactory(
							greeterArtifact.abi,
							greeterArtifact.bytecode
						)

						assert.containsAllKeys(contract.interface.functions, [
							"setGreeting(string)",
							"greet()",
						])

						assert.equal(
							await contract.signer.getAddress(),
							await signers[0].getAddress()
						)
					})

					it("should return a contract factory for an interface", async function () {
						const contract = await this.env.thor.ethers!.getContractFactory(
							iGreeterArtifact.abi,
							iGreeterArtifact.bytecode
						)
						assert.equal(contract.bytecode, "0x")
						assert.containsAllKeys(contract.interface.functions, ["greet()"])

						assert.equal(
							await contract.signer.getAddress(),
							await signers[0].getAddress()
						)
					})

					it("Should be able to send txs and make calls", async function () {
						const Greeter = await this.env.thor.ethers!.getContractFactory(
							greeterArtifact.abi,
							greeterArtifact.bytecode
						)
						const greeter = await Greeter.deploy()

						assert.equal(await greeter.functions.greet(), "Hi")
						await greeter.functions.setGreeting("Hola")
						assert.equal(await greeter.functions.greet(), "Hola")
					})

					describe("with custom signer", function () {
						it("should return a contract factory connected to the custom signer", async function () {
							// It's already compiled in artifacts/
							const contract = await this.env.thor.ethers!.getContractFactory(
								greeterArtifact.abi,
								greeterArtifact.bytecode,
								signers[1]
							)

							assert.containsAllKeys(contract.interface.functions, [
								"setGreeting(string)",
								"greet()",
							])

							assert.equal(
								await contract.signer.getAddress(),
								await signers[1].getAddress()
							)
						})
					})
				})
			})

			describe("getContractFactoryFromArtifact", function () {
				it("should return a contract factory", async function () {
					const contract = await this.env.thor.ethers!.getContractFactoryFromArtifact(
						greeterArtifact
					)

					assert.containsAllKeys(contract.interface.functions, [
						"setGreeting(string)",
						"greet()",
					])

					assert.equal(
						await contract.signer.getAddress(),
						await signers[0].getAddress()
					)
				})

				it("should link a library", async function () {
					const libraryFactory = await this.env.thor.ethers!.getContractFactory(
						"TestLibrary"
					)
					const library = await libraryFactory.deploy()

					const testContractLibArtifact = await this.env.artifacts.readArtifact(
						"TestContractLib"
					)

					const contractFactory =
						await this.env.thor.ethers!.getContractFactoryFromArtifact(
							testContractLibArtifact,
							{ libraries: { TestLibrary: library.address } }
						)

					assert.equal(
						await contractFactory.signer.getAddress(),
						await signers[0].getAddress()
					)
					const numberPrinter = await contractFactory.deploy()
					const someNumber = 50
					assert.equal(
						await numberPrinter.callStatic.printNumber(someNumber),
						someNumber * 2
					)
				})

				it("Should be able to send txs and make calls", async function () {
					const Greeter = await this.env.thor.ethers!.getContractFactoryFromArtifact(
						greeterArtifact
					)
					const greeter = await Greeter.deploy()

					assert.equal(await greeter.functions.greet(), "Hi")
					await greeter.functions.setGreeting("Hola")
					assert.equal(await greeter.functions.greet(), "Hola")
				})

				describe("with custom signer", function () {
					it("should return a contract factory connected to the custom signer", async function () {
						const contract =
							await this.env.thor.ethers!.getContractFactoryFromArtifact(
								greeterArtifact,
								signers[1]
							)

						assert.containsAllKeys(contract.interface.functions, [
							"setGreeting(string)",
							"greet()",
						])

						assert.equal(
							await contract.signer.getAddress(),
							await signers[1].getAddress()
						)
					})
				})
			})

			describe("getContractAt", function () {
				let deployedGreeter: ethers.Contract

				beforeEach(async function () {
					const Greeter = await this.env.thor.ethers!.getContractFactory("Greeter")
					deployedGreeter = await Greeter.deploy()
				})

				describe("by name and address", function () {
					it("Should return an instance of a contract", async function () {
						const contract = await this.env.thor.ethers!.getContractAt(
							"Greeter",
							deployedGreeter.address
						)

						assert.containsAllKeys(contract.functions, [
							"setGreeting(string)",
							"greet()",
						])

						assert.equal(
							await contract.signer.getAddress(),
							await signers[0].getAddress()
						)
					})

					it("Should return an instance of an interface", async function () {
						const contract = await this.env.thor.ethers!.getContractAt(
							"IGreeter",
							deployedGreeter.address
						)

						assert.containsAllKeys(contract.functions, ["greet()"])

						assert.equal(
							await contract.signer.getAddress(),
							await signers[0].getAddress()
						)
					})

					it("Should be able to send txs and make calls", async function () {
						const greeter = await this.env.thor.ethers!.getContractAt(
							"Greeter",
							deployedGreeter.address
						)

						assert.equal(await greeter.functions.greet(), "Hi")
						await greeter.functions.setGreeting("Hola")
						assert.equal(await greeter.functions.greet(), "Hola")
					})

					describe("with custom signer", function () {
						it("Should return an instance of a contract associated to a custom signer", async function () {
							const contract = await this.env.thor.ethers!.getContractAt(
								"Greeter",
								deployedGreeter.address,
								signers[1]
							)

							assert.equal(
								await contract.signer.getAddress(),
								await signers[1].getAddress()
							)
						})
					})
				})

				describe("by abi and address", function () {
					it("Should return an instance of a contract", async function () {
						const contract = await this.env.thor.ethers!.getContractAt(
							greeterArtifact.abi,
							deployedGreeter.address
						)

						assert.containsAllKeys(contract.functions, [
							"setGreeting(string)",
							"greet()",
						])

						assert.equal(
							await contract.signer.getAddress(),
							await signers[0].getAddress()
						)
					})

					it("Should return an instance of an interface", async function () {
						const contract = await this.env.thor.ethers!.getContractAt(
							iGreeterArtifact.abi,
							deployedGreeter.address
						)

						assert.containsAllKeys(contract.functions, ["greet()"])

						assert.equal(
							await contract.signer.getAddress(),
							await signers[0].getAddress()
						)
					})

					it("Should be able to send txs and make calls", async function () {
						const greeter = await this.env.thor.ethers!.getContractAt(
							greeterArtifact.abi,
							deployedGreeter.address
						)

						assert.equal(await greeter.functions.greet(), "Hi")
						await greeter.functions.setGreeting("Hola")
						assert.equal(await greeter.functions.greet(), "Hola")
					})

					// it("Should be able to detect events", async function () {
					// 	const greeter = await this.env.thor.ethers!.getContractAt(
					// 		greeterArtifact.abi,
					// 		deployedGreeter.address
					// 	)

					// 	// at the time of this writing, ethers' default polling interval is
					// 	// 4000 ms. here we turn it down in order to speed up this test.
					// 	// see also
					// 	// https://github.com/ethers-io/ethers.js/issues/615#issuecomment-848991047
					// 	const provider = greeter.provider as EthersProviderWrapper
					// 	provider.pollingInterval = 100

					// 	let eventEmitted = false
					// 	greeter.on("GreetingUpdated", () => {
					// 		eventEmitted = true
					// 	})

					// 	await greeter.functions.setGreeting("Hola")

					// 	// wait for 1.5 polling intervals for the event to fire
					// 	await new Promise((resolve) =>
					// 		setTimeout(resolve, provider.pollingInterval * 2)
					// 	)

					// 	assert.equal(eventEmitted, true)
					// })

					describe("with custom signer", function () {
						it("Should return an instance of a contract associated to a custom signer", async function () {
							const contract = await this.env.thor.ethers!.getContractAt(
								greeterArtifact.abi,
								deployedGreeter.address,
								signers[1]
							)

							assert.equal(
								await contract.signer.getAddress(),
								await signers[1].getAddress()
							)
						})
					})

					it("should work with linked contracts", async function () {
						const libraryFactory = await this.env.thor.ethers!.getContractFactory(
							"TestLibrary"
						)
						const library = await libraryFactory.deploy()

						const contractFactory = await this.env.thor.ethers!.getContractFactory(
							"TestContractLib",
							{ libraries: { TestLibrary: library.address } }
						)
						const numberPrinter = await contractFactory.deploy()

						const numberPrinterAtAddress = await this.env.thor.ethers!.getContractAt(
							"TestContractLib",
							numberPrinter.address
						)

						const someNumber = 50
						assert.equal(
							await numberPrinterAtAddress.callStatic.printNumber(someNumber),
							someNumber * 2
						)
					})
				})
			})

			describe("getContractAtFromArtifact", function () {
				let deployedGreeter: ethers.Contract

				beforeEach(async function () {
					const Greeter = await this.env.thor.ethers!.getContractFactory("Greeter")
					deployedGreeter = await Greeter.deploy()
				})

				describe("by artifact and address", function () {
					it("Should return an instance of a contract", async function () {
						const contract = await this.env.thor.ethers!.getContractAtFromArtifact(
							greeterArtifact,
							deployedGreeter.address
						)

						assert.containsAllKeys(contract.functions, [
							"setGreeting(string)",
							"greet()",
						])

						assert.equal(
							await contract.signer.getAddress(),
							await signers[0].getAddress()
						)
					})

					it("Should be able to send txs and make calls", async function () {
						const greeter = await this.env.thor.ethers!.getContractAtFromArtifact(
							greeterArtifact,
							deployedGreeter.address
						)

						assert.equal(await greeter.functions.greet(), "Hi")
						await greeter.functions.setGreeting("Hola")
						assert.equal(await greeter.functions.greet(), "Hola")
					})

					describe("with custom signer", function () {
						it("Should return an instance of a contract associated to a custom signer", async function () {
							const contract = await this.env.thor.ethers!.getContractAtFromArtifact(
								greeterArtifact,
								deployedGreeter.address,
								signers[1]
							)

							assert.equal(
								await contract.signer.getAddress(),
								await signers[1].getAddress()
							)
						})
					})
				})
			})
		})
	})
})
