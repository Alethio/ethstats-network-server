import AbstractModel from './AbstractModel';

export default class NodeRecoveryRequests extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = `${this.namespace}:node_recovery_requests`;
  }

  async add(params) {
    return this.redis.get(this.table).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      let tableLength = newData.push({
        recoveryRequestId: params.recoveryRequestId,
        accountEmail: params.accountEmail,
        nodeName: params.nodeName,
        recoveryHash: params.recoveryHash,
        createdTimestamp: params.createdTimestamp
      });

      if (tableLength > this.appConfig.LITE_DB_LIMIT) {
        newData.shift();
      }

      this.redis.set(this.table, JSON.stringify(newData));
      return newData.length;
    });
  }

  /*
   * Get params
   *
   * recoveryRequestId
   * recoveryHash
   * limit
   * countOnly
   */
  async get(params) {
    if (this.lodash.isEmpty(params)) {
      return null;
    }

    let returnObject = this.lodash.cloneDeep(this.returnObject);

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        returnObject.rows = JSON.parse(data);

        if (params.recoveryRequestId) {
          returnObject.rows = this.lodash.filter(returnObject.rows, {recoveryRequestId: params.recoveryRequestId});
        }

        if (params.recoveryHash) {
          returnObject.rows = this.lodash.filter(returnObject.rows, {recoveryHash: params.recoveryHash});
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
      }

      return returnObject;
    });
  }
}
