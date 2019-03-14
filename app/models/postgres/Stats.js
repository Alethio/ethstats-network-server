import AbstractModel from './AbstractModel';

export default class Stats extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'stats';
  }

  add(params) {
    let query = `INSERT INTO stats (
      "nodeName",
      "isMining",
      "peerCount",
      "hashrate",
      "gasPrice",
      "wsLatency",
      "receivedTimestamp"
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`;
    let queryParams = [
      params.nodeName,
      params.isMining,
      params.peerCount,
      params.hashrate,
      params.gasPrice,
      params.wsLatency
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
