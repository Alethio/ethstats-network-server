import requestPromise from 'request-promise-native';

export default class Infura {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.log = diContainer.logger;
    this.lodash = diContainer.lodash;
    this.requestPromise = requestPromise;
    this.bigNumberUtils = diContainer.bigNumberUtils;

    this.networkName = this.appConfig.NETWORK_NAME;
    this.url = this.appConfig.INFURA_URL;
    this.projectId = this.appConfig.INFURA_PROJECT_ID;
    this.projectSecret = this.appConfig.INFURA_PROJECT_SECRET;
  }

  request(jsonRpcObject) {
    let requestOptions = {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(':' + this.projectSecret).toString('base64')}`
      },
      uri: `https://${this.networkName}.${this.url}/${this.projectId}`,
      json: false,
      body: JSON.stringify(jsonRpcObject)
    };

    this.log.debug(`Infura request: ${JSON.stringify(requestOptions)}`);

    return this.requestPromise(requestOptions).then(requestResult => {
      let result = null;
      requestResult = JSON.parse(requestResult);

      if (requestResult.error) {
        this.log.error(`Infura => ${requestResult.error.message}`);
      } else {
        result = requestResult.result;
      }

      return result;
    }).catch(error => {
      this.log.error(`Infura => ${JSON.stringify(error)}`);
    });
  }

  getBlockByNumber(number) {
    let jsonRpcObject = {
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: [this.bigNumberUtils.getHex(number, true), false],
      id: 1
    };

    return this.request(jsonRpcObject);
  }

  getLastBlockNumber() {
    let jsonRpcObject = {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    };

    return this.request(jsonRpcObject);
  }
}
