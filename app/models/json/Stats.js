import AbstractModel from './AbstractModel';

export default class Stats extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'stats';
  }

  async add(params) {
    let tableLength = this.jsonDB[this.table].push({
      nodeName: params.nodeName,
      isMining: params.isMining,
      peerCount: params.peerCount,
      hashrate: params.hashrate,
      gasPrice: params.gasPrice,
      wsLatency: params.wsLatency,
      receivedTimestamp: Date.now()
    });

    if (tableLength > this.appConfig.LITE_DB_LIMIT) {
      this.jsonDB[this.table].shift();
    }

    return this.jsonDB[this.table].length;
  }

  /*
   * Get params
   *
   * nodeName
   * timestampStart
   * timestampEnd
   * order
   * limit
   * countOnly
   */
  async get(params) {
    if (this.lodash.isEmpty(params)) {
      return null;
    }

    let returnObject = this.lodash.cloneDeep(this.returnObject);
    returnObject.rows = this.jsonDB[this.table];

    if (params.nodeName) {
      returnObject.rows = this.lodash.filter(returnObject.rows, {nodeName: params.nodeName});
    }

    if (params.timestampStart) {
      returnObject.rows = this.lodash.filter(returnObject.rows, row => {
        return row.receivedTimestamp >= params.timestampStart;
      });
    }

    if (params.timestampEnd) {
      returnObject.rows = this.lodash.filter(returnObject.rows, row => {
        return row.receivedTimestamp <= params.timestampEnd;
      });
    }

    if (params.order) {
      returnObject.rows = this.lodash.orderBy(returnObject.rows, ['receivedTimestamp'], [params.order]);
    }

    if (params.limit) {
      returnObject.rows = this.lodash.slice(returnObject.rows, 0, params.limit);
    }

    if (params.countOnly) {
      returnObject.rows = [{
        count: returnObject.rows.length
      }];
    }

    returnObject.rowLength = returnObject.rows.length;

    return returnObject;
  }
}
