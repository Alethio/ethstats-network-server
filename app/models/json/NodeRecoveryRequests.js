import AbstractModel from './AbstractModel';

export default class NodeRecoveryRequests extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'node_recovery_requests';
  }

  async add(params) {
    let tableLength = this.jsonDB[this.table].push({
      recoveryRequestId: params.recoveryRequestId,
      accountEmail: params.accountEmail,
      nodeName: params.nodeName,
      recoveryHash: params.recoveryHash,
      createdTimestamp: params.createdTimestamp
    });

    if (tableLength > this.appConfig.LITE_DB_LIMIT) {
      this.jsonDB[this.table].shift();
    }

    return this.jsonDB[this.table].length;
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
    returnObject.rows = this.jsonDB[this.table];

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

    return returnObject;
  }
}
