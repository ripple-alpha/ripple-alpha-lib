'use strict';
const RippleAlphaAPI = require('../../src').RippleAlphaAPI; // require('ripple-alpha-lib')

const api = new RippleAlphaAPI({server: 'wss://s1.ripplealpha.com:6005'});
const address = 'r3kmLJN5D28dHuH8vZNUZpMC43pEHpaocV';

api.connect().then(() => {
  api.getBalances(address).then(balances => {
    console.log(JSON.stringify(balances, null, 2));
    process.exit();
  });
});
