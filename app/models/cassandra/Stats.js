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
    ) VALUES (?, ?, ?, ?, ?, ?, toTimestamp(now()))`;
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
