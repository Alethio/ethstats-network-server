import AbstractModel from './AbstractModel';

export default class BlockConfirmations extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'block_confirmations';
    this.numberPartitionDivider = 1000;
  }

  add(params) {
    let queries = [];

    let query = `INSERT INTO block_confirmations (
      "nodeName",
      "blockNumber",
      "blockHash",
      "confirmationTimestamp",
      "propagationTime"
    ) VALUES ($1, $2, $3, $4, $5)`;

    let queryParams = [
      params.nodeName,
      params.blockNumber,
      params.blockHash,
      new Date(params.confirmationTimestamp).toISOString(),
      params.propagationTime
    ];

    return this.executeQuery(query, queryParams);
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
  get(params) {
    let result = null;

    if (this.lodash.isEmpty(params)) {
      return result;
    }

    let query = `SELECT ${params.countOnly ? 'count(*) as count' : '*'} FROM ${this.table} WHERE `;
    let whereClauses = [];
    let queryParams = [];
    let queryParamIdx = 0;

    if (params.nodeName !== undefined) {
      queryParamIdx++;
      whereClauses.push(`"nodeName" = $${queryParamIdx}`);
      queryParams.push(params.nodeName);
    }

    if (params.blockNumber !== undefined) {
      queryParamIdx++;
      whereClauses.push(`"blockNumber" = $${queryParamIdx}`);
      queryParams.push(params.blockNumber);
    }

    if (params.blockHash !== undefined) {
      queryParamIdx++;
      whereClauses.push(`"blockHash" = $${queryParamIdx}`);
      queryParams.push(params.blockHash);
    }

    if (params.timestampStart !== undefined) {
      queryParamIdx++;
      whereClauses.push(`"confirmationTimestamp" >= $${queryParamIdx}`);
      queryParams.push(new Date(params.timestampStart).toISOString());
    }

    if (params.timestampEnd !== undefined) {
      queryParamIdx++;
      whereClauses.push(`"confirmationTimestamp" <= $${queryParamIdx}`);
      queryParams.push(new Date(params.timestampEnd).toISOString());
    }

    if (whereClauses.length > 0) {
      query += whereClauses.join(' AND ');

      if (!params.countOnly && params.order) {
        query += ` ORDER BY "confirmationTimestamp" ${params.order}`;
      }

      if (params.limit) {
        queryParamIdx++;
        query += ` LIMIT $${queryParamIdx}`;
        queryParams.push(params.limit);
      }

      result = this.executeQuery(query, queryParams);
    }

    return result;
  }

  getOlderThanBlockNumber(referenceBlockNumber, limit) {
    let blockNumberMin = parseInt(referenceBlockNumber, 10) - parseInt(limit, 10);
    let blockNumberMax = parseInt(referenceBlockNumber, 10);
    let queryParams = [];

    let query = 'SELECT * FROM block_confirmations WHERE "blockNumber" >= $1 AND "blockNumber" <= $2';

    queryParams.push(blockNumberMin);
    queryParams.push(blockNumberMax);

    return this.executeQuery(query, queryParams);
  }
}
