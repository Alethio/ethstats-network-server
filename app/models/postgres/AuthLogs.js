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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;
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
      new Date(params.loginTimestamp).toISOString()
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
      query += ` AND "loginTimestamp" >= $${queryParamIdx}`;
      queryParams.push(new Date(params.timestampStart).toISOString());
    }

    if (params.timestampEnd) {
      queryParamIdx++;
      query += ` AND "loginTimestamp" <= $${queryParamIdx}`;
      queryParams.push(new Date(params.timestampEnd).toISOString());
    }

    if (!params.countOnly && params.order) {
      query += ` ORDER BY "loginTimestamp" ${params.order}`;
    }

    if (params.limit) {
      queryParamIdx++;
      query += ` LIMIT $${queryParamIdx}`;
      queryParams.push(params.limit);
    }

    return this.executeQuery(query, queryParams);
  }
}
