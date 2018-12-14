import AbstractModel from './AbstractModel';

export default class BlockConfirmations extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'block_confirmations';
    this.numberPartitionDivider = 1000;
  }

  async add(params) {
    return this.jsonDB[this.table].push({
      nodeName: params.nodeName,
      blockNumber: params.blockNumber,
      blockHash: params.blockHash,
      confirmationTimestamp: params.confirmationTimestamp,
      propagationTime: params.propagationTime
    });
  }

  /*
   * Get params
   *
   * nodeName
   * blockNumber
   * blockHash
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

    if (params.blockNumber) {
      returnObject.rows = this.lodash.filter(returnObject.rows, {blockNumber: params.blockNumber});
    }

    if (params.blockHash) {
      returnObject.rows = this.lodash.filter(returnObject.rows, {blockHash: params.blockHash});
    }

    if (params.timestampStart) {
      returnObject.rows = this.lodash.filter(returnObject.rows, row => {
        return row.confirmationTimestamp >= params.timestampStart;
      });
    }

    if (params.timestampEnd) {
      returnObject.rows = this.lodash.filter(returnObject.rows, row => {
        return row.confirmationTimestamp <= params.timestampEnd;
      });
    }

    if (params.order) {
      returnObject.rows = this.lodash.orderBy(returnObject.rows, ['confirmationTimestamp'], [params.order]);
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

  async getOlderThanBlockNumber(referenceBlockNumber, limit) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);
    let blockNumberMin = parseInt(referenceBlockNumber, 10) - parseInt(limit, 10);
    let blockNumberMax = parseInt(referenceBlockNumber, 10);

    returnObject.rows = this.lodash.filter(this.jsonDB[this.table], row => {
      return row.blockNumber >= blockNumberMin && row.blockNumber <= blockNumberMax;
    });

    returnObject.rowLength = returnObject.rows.length;

    return returnObject;
  }
}
