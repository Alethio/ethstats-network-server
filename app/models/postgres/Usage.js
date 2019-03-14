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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`;
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

    let queryParamIdx = 1;
    let query = `SELECT ${params.countOnly ? 'count(*) as count' : '*'} FROM ${this.table} WHERE "nodeName" = $${queryParamIdx}`;
    let queryParams = [params.nodeName];

    if (params.timestampStart) {
      queryParamIdx++;
      query += ` AND "receivedTimestamp" >= $${queryParamIdx}`;
      queryParams.push(new Date(params.timestampStart).toISOString());
    }

    if (params.timestampEnd) {
      queryParamIdx++;
      query += ` AND "receivedTimestamp" <= $${queryParamIdx}`;
      queryParams.push(new Date(params.timestampEnd).toISOString());
    }

    if (!params.countOnly && params.order) {
      query += ` ORDER BY "receivedTimestamp" ${params.order}`;
    }

    if (params.limit) {
      queryParamIdx++;
      query += ` LIMIT $${queryParamIdx}`;
      queryParams.push(params.limit);
    }

    return this.executeQuery(query, queryParams);
  }
}
