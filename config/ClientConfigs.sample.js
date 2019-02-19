const DOMAIN_NAME = 'ethstats.io';

const clientConfigs = {
  serverUrl: {
    mainnet: {
      networkName: 'mainnet',
      url: `https://server.net.${DOMAIN_NAME}:443`
    },
    rinkeby: {
      networkName: 'rinkeby',
      url: `https://server.net.rinkeby.${DOMAIN_NAME}:443`
    },
    goerli: {
      networkName: 'goerli',
      url: `https://server.net.goerli.${DOMAIN_NAME}:443`
    }/*,
    ropsten: {
      networkName: 'ropsten',
      url: `https://server.net.ropsten.${DOMAIN_NAME}:443`
    },
    kovan: {
      networkName: 'kovan',
      url: `https://server.net.kovan.${DOMAIN_NAME}:443`
    }*/
  },
  dashboardUrl: {
    mainnet: {
      networkName: 'mainnet',
      url: `https://net.${DOMAIN_NAME}`
    },
    rinkeby: {
      networkName: 'rinkeby',
      url: `https://net.rinkeby.${DOMAIN_NAME}`
    },
    goerli: {
      networkName: 'goerli',
      url: `https://net.goerli.${DOMAIN_NAME}`
    }/*,
    ropsten: {
      networkName: 'ropsten',
      url: `https://net.ropsten.${DOMAIN_NAME}`
    },
    kovan: {
      networkName: 'kovan',
      url: `https://net.kovan.${DOMAIN_NAME}`
    }*/
  },
  privacyPolicyUrl: `https://net.${DOMAIN_NAME}/privacy-policy`
};

export default clientConfigs;
