import AbstractModel from './AbstractModel';

export default class Validators extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = `${this.namespace}:validators`;
  }

  async add(params) {
    let validators = await this.get({blockNumber: params.blockNumber, blockHash: params.blockHash});

    if (validators.rowLength === 0) {
      return this.redis.get(this.table).then(data => {
        let newData = (data === null) ? [] : JSON.parse(data);
        let tableLength = newData.push({
          blockNumber: params.blockNumber,
          blockHash: params.blockHash,
          validators: JSON.stringify(params.validators)
        });

        if (tableLength > this.appConfig.LITE_DB_LIMIT) {
          newData.shift();
        }

        this.redis.set(this.table, JSON.stringify(newData));
        return newData.length;
      });
    }

    return false;
  }

  /*
   * Get params
   *
   * blockNumber
   * blockHash
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
      }

      return returnObject;
    });
  }
}
