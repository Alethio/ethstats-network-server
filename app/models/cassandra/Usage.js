import AbstractModel from './AbstractModel';

export default class Usage extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'usage';
  }

  add(params) {
    let query = `INSERT INTO usage (
      "nodeName",
      "hostCpuLoad",
      "hostMemTotal",
      "hostMemUsed",
      "hostNetRxSec",
      "hostNetTxSec",
      "hostFsRxSec",
      "hostFsWxSec",
      "hostDiskRIOSec",
      "hostDiskWIOSec",
      "nodeCpuLoad",
      "nodeMemLoad",
      "clientCpuLoad",
      "clientMemLoad",
      "receivedTimestamp"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, toTimestamp(now()))`;
    let queryParams = [
      params.nodeName,
      params.hostCpuLoad,
      params.hostMemTotal,
      params.hostMemUsed,
      params.hostNetRxSec,
      params.hostNetTxSec,
      params.hostFsRxSec,
      params.hostFsWxSec,
      params.hostDiskRIOSec,
      params.hostDiskWIOSec,
      params.nodeCpuLoad,
      params.nodeMemLoad,
      params.clientCpuLoad,
      params.clientMemLoad
    ];

    return this.executeQuery(query, queryParams);
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
  get(params) {
    if (this.lodash.isEmpty(params)) {
      return null;
    }

    let query = `SELECT ${params.countOnly ? 'count(*) as count' : '*'} FROM ${this.table} WHERE "nodeName" = ?`;
    let queryParams = [params.nodeName];

    if (params.timestampStart) {
      query += ' AND "receivedTimestamp" >= ?';
      queryParams.push(params.timestampStart);
    }

    if (params.timestampEnd) {
      query += ' AND "receivedTimestamp" <= ?';
      queryParams.push(params.timestampEnd);
    }

    if (params.order) {
      query += ` ORDER BY "receivedTimestamp" ${params.order}`;
    }

    if (params.limit) {
      query += ' LIMIT ?';
      queryParams.push(params.limit);
    }

    return this.executeQuery(query, queryParams);
  }
}
