import AbstractModel from './AbstractModel';

export default class Usage extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'usage';
  }

  async add(params) {
    let tableLength = this.jsonDB[this.table].push({
      nodeName: params.nodeName,
      hostCpuLoad: params.hostCpuLoad,
      hostMemTotal: params.hostMemTotal,
      hostMemUsed: params.hostMemUsed,
      hostNetRxSec: params.hostNetRxSec,
      hostNetTxSec: params.hostNetTxSec,
      hostFsRxSec: params.hostFsRxSec,
      hostFsWxSec: params.hostFsWxSec,
      hostDiskRIOSec: params.hostDiskRIOSec,
      hostDiskWIOSec: params.hostDiskWIOSec,
      nodeCpuLoad: params.nodeCpuLoad,
      nodeMemLoad: params.nodeMemLoad,
      clientCpuLoad: params.clientCpuLoad,
      clientMemLoad: params.clientMemLoad,
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
