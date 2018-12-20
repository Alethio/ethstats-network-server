import AbstractModel from './AbstractModel';

export default class AuthLogs extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'auth_logs';
  }

  async add(params) {
    let tableLength = this.jsonDB[this.table].push({
      nodeName: params.nodeName,
      coinbase: params.coinbase,
      node: params.node,
      net: params.net,
      protocol: params.protocol,
      api: params.api,
      os: params.os,
      osVersion: params.osVersion,
      ip: params.ip,
      client: params.client,
      cpu: params.cpu,
      memory: params.memory,
      disk: params.disk,
      loginTimestamp: params.loginTimestamp,
      logoutTimestamp: null,
      onlineTime: 0
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
        return row.loginTimestamp >= params.timestampStart;
      });
    }

    if (params.timestampEnd) {
      returnObject.rows = this.lodash.filter(returnObject.rows, row => {
        return row.loginTimestamp <= params.timestampEnd;
      });
    }

    if (params.order) {
      returnObject.rows = this.lodash.orderBy(returnObject.rows, ['loginTimestamp'], [params.order]);
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
