const ETHSTATS_DOMAIN = 'ethstats.io';

const clientConfigs = {
  serverUrl: {
    mainnet: {
      networkName: 'mainnet',
      url: `https://server.net.${ETHSTATS_DOMAIN}:443`
    },
    rinkeby: {
      networkName: 'rinkeby',
      url: `https://server.net.rinkeby.${ETHSTATS_DOMAIN}:443`
    },
    goerli: {
      networkName: 'goerli',
      url: `https://server.net.goerli.${ETHSTATS_DOMAIN}:443`
    }/*,
    ropsten: {
      networkName: 'ropsten',
      url: `https://server.net.ropsten.${ETHSTATS_DOMAIN}:443`
    },
    kovan: {
      networkName: 'kovan',
      url: `https://server.net.kovan.${ETHSTATS_DOMAIN}:443`
    }*/
  },
  dashboardUrl: `https://net.${ETHSTATS_DOMAIN}`,
  privacyPolicyUrl: `https://net.${ETHSTATS_DOMAIN}/privacy-policy`
};

export default clientConfigs;
