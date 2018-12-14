import requestPromise from 'request-promise-native';

export default class Infura {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.log = diContainer.logger;
    this.lodash = diContainer.lodash;
    this.requestPromise = requestPromise;
    this.bigNumberUtils = diContainer.bigNumberUtils;

    this.network = this.appConfig.NETWORK;
    this.apiUrl = this.appConfig.INFURA_API_URL;
    this.apiKey = this.appConfig.INFURA_API_KEY;
  }

  get(params) {
    let requestOptions = {
      method: 'GET',
      uri: `${this.apiUrl}/${this.network}/${params.method}?token=${this.apiKey}`,
      json: true
    };

    if (params.params) {
      requestOptions.uri += `&params=${params.params}`;
    }

    this.log.debug(`Infura request: ${JSON.stringify(requestOptions)}`);

    return this.requestPromise(requestOptions).then(requestResult => {
      let result = null;

      if (requestResult.error) {
        this.log.error(`Infura => ${requestResult.error.message}`);
      } else {
        result = requestResult.result;
      }

      return result;
    }).catch(error => {
      let errorMessage = this.lodash.isObject(error.error) ? ((error.error.body === undefined) ? error.error : error.error.body.errors[0]) : error.message;
      this.log.error(`Infura => ${errorMessage}`);
    });
  }

  getBlockByNumber(number) {
    let requestParams = {
      method: 'eth_getBlockByNumber',
      params: `["${this.bigNumberUtils.getHex(number, true)}",true]`
    };

    return this.get(requestParams);
  }

  getLastBlockNumber() {
    let requestParams = {
      method: 'eth_blockNumber'
    };

    return this.get(requestParams);
  }
}
