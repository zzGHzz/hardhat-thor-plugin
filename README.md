# hardhat-thor-plugin

[Hardhat](https://github.com/NomicFoundation/hardhat) plugin for integrating the VeChain [Thor](https://github.com/vechain/thor) protocol.

## Installation

```bash
npm install --save-dev hardhat-thor-plugin
```

Import the plugin in your `hardhat.config.js`:

```js
require("hardhat-thor-plugin");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "hardhat-thor-plugin";
```
## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugins adds an `thor` object to the Hardhat Runtime Environment. The object contains the `ethers` field which provides the same API as the [hardhat-ethers](https://github.com/NomicFoundation/hardhat/tree/master/packages/hardhat-ethers) plugin.

## Configuration

This plugin extends the `HardhatUserConfig` object with an optional `thor` field defined as following:

```ts
{
  url: string;
  privateKeys?:	string;
  delegate?: string;
}
```

where `url` points to the Thor node, `privateKeys` contains private keys that can be used to sign transactions, and `delegate` is the url of the gas fee delegator.

This is an example of how to set it in `hardhat.config.ts`:

```ts
import { HardhatUserConfig } from "hardhat/config";
import "hardhat-thor-plugin";

const config: HardhatUserConfig = {
  thor: {
    url: 'http://127.0.0.1:8669',
    privateKeys: ['0x...']
  }
};

export default config;
```

## Usage

There are no additional steps you need to take for this plugin to work. Install it and access ethers through the Hardhat Runtime Environment anywhere you need it (tasks, scripts, tests, etc). 

For example, you can define task `accounts` to print all the accounts defined by the private keys input in `hardhat.config.ts`:

```ts
import "hardhat-thor-plugin";

task('accounts', 'print', async (_, hre) => {
  if(!hre.thor.ethers) {
    await hre.thor.connect()
  }

  if(!hre.thor.ethers) {
    throw new Error('Failed to connect')
  }

  const signers = await hre.thor.ethers.getSigners()
  for (const signer of signers) {
    console.log(await signer.getAddress())
  }
  
  hre.thor.close()
})
```

Note that you would have to invoke

```ts
await hre.thor.connect()
```

to make `hre.thor.ethers` available. The following line

```ts
hre.thor.close()
```

is used to disconnect from the Thor node.

To define a `mocha` test:

```ts
import { expect } from "chai"
import { thor } from "hardhat"

describe("Test", function () {
  before('Connecting', async function () {
    await thor.connect()
  })

  after('Disconnecting', function () {
    thor.close()
  })

  ...
})
```

More examples can be found at repo [hardhat-thor-plugin-example](https://github.com/zzGHzz/hardhat-thor-plugin-example)

## Acknowledgement

Special thanks to

- [@vechain.energy](https://gitlab.com/vechain.energy/common/hardhat-thor) for their work that inspires this project
- [hardhat-ethers](https://github.com/NomicFoundation/hardhat/tree/master/packages/hardhat-ethers) plugin since this project borrows their implementation of the helper methods. 