import requestPromise from 'request-promise-native';

export default class EthstatsBlobApi {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.log = diContainer.logger;
    this.lodash = diContainer.lodash;
    this.requestPromise = requestPromise;

    this.networkName = this.appConfig.NETWORK_NAME;
    this.apiUrl = this.appConfig.ETHSTATS_BLOB_API_URL;
    this.apiKey = this.appConfig.ETHSTATS_BLOB_API_KEY;
  }

  get(params) {
    let requestOptions = {
      method: 'GET',
      headers: {
        'X-Auth-Token': this.apiKey
      },
      uri: params.uri,
      json: true
    };

    this.log.debug(`EthstatsBlobApi request: ${JSON.stringify(requestOptions)}`);

    return this.requestPromise(requestOptions).then(requestResult => {
      let result = null;

      if (requestResult.error) {
        this.log.error(`EthstatsBlobApi => ${requestResult.error.message}`);
      } else {
        result = requestResult.result;
      }

      return result;
    }).catch(error => {
      let errorMessage = this.lodash.isObject(error.error) ? ((error.error.body === undefined) ? error.error : error.error.body.errors[0]) : error.message;
      this.log.error(`EthstatsBlobApi => ${errorMessage}`);
    });
  }

  getBlockByNumber(number) {
    let requestParams = {
      uri: `${this.apiUrl}/${this.networkName}/blocks/rpc/${number}?call=eth_getBlockByNumber`
    };

    return this.get(requestParams);
  }
}
