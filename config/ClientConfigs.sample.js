const DOMAIN_NAME = 'ethstats.io';

const clientConfigs = {
  serverUrl: {
    mainnet: {
      networkName: 'mainnet',
      url: `https://server.${DOMAIN_NAME}:443`
    },
    rinkeby: {
      networkName: 'rinkeby',
      url: `https://server.rinkeby.${DOMAIN_NAME}:443`
    },
    goerli: {
      networkName: 'goerli',
      url: `https://server.goerli.${DOMAIN_NAME}:443`
    }/*,
    ropsten: {
      networkName: 'ropsten',
      url: `https://server.ropsten.${DOMAIN_NAME}:443`
    },
    kovan: {
      networkName: 'kovan',
      url: `https://server.kovan.${DOMAIN_NAME}:443`
    }*/
  },
  dashboardUrl: {
    mainnet: {
      networkName: 'mainnet',
      url: `https://${DOMAIN_NAME}`
    },
    rinkeby: {
      networkName: 'rinkeby',
      url: `https://rinkeby.${DOMAIN_NAME}`
    },
    goerli: {
      networkName: 'goerli',
      url: `https://goerli.${DOMAIN_NAME}`
    }/*,
    ropsten: {
      networkName: 'ropsten',
      url: `https://ropsten.${DOMAIN_NAME}`
    },
    kovan: {
      networkName: 'kovan',
      url: `https://kovan.${DOMAIN_NAME}`
    }*/
  },
  privacyPolicyUrl: `https://${DOMAIN_NAME}/privacy-policy`
};

export default clientConfigs;
