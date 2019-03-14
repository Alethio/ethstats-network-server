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
    ) VALUES ($1, $2, $3, $4, $5)`;
    let queryParams = [
      params.recoveryRequestId,
      params.accountEmail,
      params.nodeName,
      params.recoveryHash,
      new Date(params.createdTimestamp).toISOString()
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

    let queryParamIdx = 0;
    let query = `SELECT ${params.countOnly ? 'count(*) as count' : '*'} FROM ${this.table}`;
    let whereClauses = [];
    let queryParams = [];

    if (params.recoveryRequestId) {
      queryParamIdx++;
      whereClauses.push(`"recoveryRequestId" = $${queryParamIdx}`);
      queryParams.push(params.recoveryRequestId);
    }

    if (params.recoveryHash) {
      queryParamIdx++;
      whereClauses.push(`"recoveryHash" = $${queryParamIdx}`);
      queryParams.push(params.recoveryHash);
    }

    if (whereClauses.length > 0) {
      query = query + ' WHERE ' + whereClauses.join(' AND ');
    }

    if (params.limit) {
      queryParamIdx++;
      query += ` LIMIT $${queryParamIdx}`;
      queryParams.push(params.limit);
    }

    result = this.executeQuery(query, queryParams);

    return result;
  }
}
