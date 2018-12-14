import AbstractModel from './AbstractModel';

export default class AuthLogs extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'auth_logs';
  }

  add(params) {
    let query = `INSERT INTO auth_logs (
      "nodeName",
      "coinbase",
      "node",
      "net",
      "protocol",
      "api",
      "os",
      "osVersion",
      "ip",
      "client",
      "cpu",
      "memory",
      "disk",
      "loginTimestamp"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    let queryParams = [
      params.nodeName,
      params.coinbase,
      params.node,
      params.net,
      params.protocol,
      params.api,
      params.os,
      params.osVersion,
      params.ip,
      params.client,
      params.cpu,
      params.memory,
      params.disk,
      params.loginTimestamp
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
      query += ' AND "loginTimestamp" >= ?';
      queryParams.push(params.timestampStart);
    }

    if (params.timestampEnd) {
      query += ' AND "loginTimestamp" <= ?';
      queryParams.push(params.timestampEnd);
    }

    if (params.order) {
      query += ` ORDER BY "loginTimestamp" ${params.order}`;
    }

    if (params.limit) {
      query += ' LIMIT ?';
      queryParams.push(params.limit);
    }

    return this.executeQuery(query, queryParams);
  }
}
