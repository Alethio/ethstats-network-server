import AbstractModel from './AbstractModel';

export default class NodeRecoveryRequests extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'node_recovery_requests';
  }

  add(params) {
    let query = `INSERT INTO node_recovery_requests (
      "recoveryRequestId", 
      "accountEmail", 
      "nodeName", 
      "recoveryHash", 
      "createdTimestamp"
    ) VALUES (?, ?, ?, ?, ?)`;
    let queryParams = [
      params.recoveryRequestId,
      params.accountEmail,
      params.nodeName,
      params.recoveryHash,
      params.createdTimestamp
    ];

    return this.executeQuery(query, queryParams);
  }

  /*
   * Get params
   *
   * recoveryRequestId
   * recoveryHash
   * limit
   * countOnly
   */
  get(params) {
    let result = null;

    if (this.lodash.isEmpty(params)) {
      return result;
    }

    let query = `SELECT ${params.countOnly ? 'count(*) as count' : '*'} FROM ${this.table}`;
    let whereClauses = [];
    let queryParams = [];

    if (params.recoveryRequestId) {
      whereClauses.push('"recoveryRequestId" = ?');
      queryParams.push(params.recoveryRequestId);
    }

    if (params.recoveryHash) {
      whereClauses.push('"recoveryHash" = ?');
      queryParams.push(params.recoveryHash);
    }

    if (whereClauses.length > 0) {
      query = query + ' WHERE ' + whereClauses.join(' AND ');
    }

    if (params.limit) {
      query += ' LIMIT ?';
      queryParams.push(params.limit);
    }

    result = this.executeQuery(query, queryParams);

    return result;
  }
}
