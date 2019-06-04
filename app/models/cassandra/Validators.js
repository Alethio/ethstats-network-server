import AbstractModel from './AbstractModel';

export default class Validators extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'validators';
    this.numberPartitionDivider = 10000;
  }

  add(params) {
    let query = `INSERT INTO validators (
      "blockNumberPartition",
      "blockNumber",
      "blockHash",
      "validators"
    ) VALUES (?, ?, ?, ?)`;
    let queryParams = [
      Math.floor(params.blockNumber / this.numberPartitionDivider),
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
    if (this.lodash.isEmpty(params)) {
      return null;
    }

    let blockNumberPartition = Math.floor(params.blockNumber / this.numberPartitionDivider);
    let query = `SELECT ${params.countOnly ? 'count(*) as count' : '*'} FROM ${this.table} WHERE "blockNumberPartition" = ?`;
    let queryParams = [blockNumberPartition];

    if (params.blockNumber) {
      query += ' AND "blockNumber" = ?';
      queryParams.push(params.blockNumber);
    }

    if (params.blockHash) {
      query += ' AND "blockHash" = ?';
      queryParams.push(params.blockHash);
    }

    if (params.limit) {
      query += ' LIMIT ?';
      queryParams.push(params.limit);
    }

    return this.executeQuery(query, queryParams);
  }
}
