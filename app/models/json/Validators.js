import AbstractModel from './AbstractModel';

export default class Validators extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'validators';
  }

  async add(params) {
    let tableLength = this.jsonDB[this.table].push({
      blockNumber: params.blockNumber,
      blockHash: params.blockHash,
      validators: JSON.stringify(params.validators)
    });

    if (tableLength > this.appConfig.LITE_DB_LIMIT) {
      this.jsonDB[this.table].shift();
    }

    return this.jsonDB[this.table].length;
  }

  /*
   * Get params
   *
   * blockNumber
   * blockHash
   * limit
   * countOnly
   */
  get(params) {
    if (this.lodash.isEmpty(params)) {
      return null;
    }

    let returnObject = this.lodash.cloneDeep(this.returnObject);
    returnObject.rows = this.jsonDB[this.table];

    if (params.blockNumber) {
      returnObject.rows = this.lodash.filter(returnObject.rows, {blockNumber: params.blockNumber});
    }

    if (params.blockHash) {
      returnObject.rows = this.lodash.filter(returnObject.rows, {blockHash: params.blockHash});
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
