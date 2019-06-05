import AbstractModel from './AbstractModel';

export default class Validators extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'validators';
  }

  add(params) {
    let query = `INSERT INTO validators (
      "blockNumber",
      "blockHash",
      "validators"
    ) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`;
    let queryParams = [
      params.blockNumber,
      params.blockHash,
      JSON.stringify(params.validators)
    ];

    return this.executeQuery(query, queryParams);
  }

  /*
   * Get params
   *
   * blockNumber
   * blockHash
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

    if (whereClauses.length > 0) {
      query += whereClauses.join(' AND ');

      if (params.limit) {
        queryParamIdx++;
        query += ` LIMIT $${queryParamIdx}`;
        queryParams.push(params.limit);
      }

      result = this.executeQuery(query, queryParams);
    }

    return result;
  }
}
