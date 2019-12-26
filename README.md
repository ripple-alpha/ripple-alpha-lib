# ripple-alpha-lib (Ripple Alpha API)

A JavaScript/TypeScript API for interacting with the XLA Ledger

This is the recommended library for integrating a JavaScript/TypeScript app with the XLA Ledger, especially if you intend to use advanced functionality such as IOUs, payment paths, the decentralized exchange, account settings, payment channels, escrows, multi-signing, and more.

### Features

+ Connect to a `ripple-alpha-core` server from Node.js or a web browser
+ Listen to events on the XLA Ledger (transactions, ledger, validations, etc.)
+ Sign and submit transactions to the XLA Ledger
+ Type definitions for TypeScript

### Requirements

+ **[Node v10](https://nodejs.org/)** is recommended. Other versions may work but are not frequently tested.
+ **[Yarn](https://yarnpkg.com/)** is recommended. `npm` may work but we use `yarn.lock`.

### Install

In an existing project (with `package.json`), install `ripple-alpha-lib`:
```
$ yarn add ripple-alpha-lib
```

## Development

To build the library for Node.js and the browser:
```
$ yarn build
```

The TypeScript compiler will [output](./tsconfig.json#L7) the resulting JS files in `./dist/npm/`.

webpack will output the resulting JS files in `./build/`.

For details, see the `scripts` in `package.json`.

## Generating Documentation

Do not edit `./docs/index.md` directly because it is a generated file.

Instead, edit the appropriate `.md.ejs` files in `./docs/src/`.

If you make changes to the JSON schemas, fixtures, or documentation sources, update the documentation by running `yarn run docgen`.