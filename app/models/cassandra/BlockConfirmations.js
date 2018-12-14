import AbstractModel from './AbstractModel';

export default class BlockConfirmations extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'block_confirmations1';
    this.numberPartitionDivider = 1000;
  }

  add(params) {
    let queries = [];

    queries.push({
      query: `INSERT INTO block_confirmations1 (
      "nodeName",
      "blockNumber",
      "blockHash",
      "confirmationTimestamp",
      "propagationTime"
    ) VALUES (?, ?, ?, ?, ?)`,
      params: [
        params.nodeName,
        params.blockNumber,
        params.blockHash,
        params.confirmationTimestamp,
        params.propagationTime
      ]
    });

    queries.push({
      query: `INSERT INTO block_confirmations2 (
        "blockNumberPartition",
        "blockNumber",
        "nodeName",
        "blockHash",
        "confirmationTimestamp",
        "propagationTime"
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      params: [
        params.blockNumber / this.numberPartitionDivider,
        params.blockNumber,
        params.nodeName,
        params.blockHash,
        params.confirmationTimestamp,
        params.propagationTime
      ]
    });

    return this.executeBatch(queries);
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

    if (params.nodeName !== undefined) {
      whereClauses.push('"nodeName" = ?');
      queryParams.push(params.nodeName);
    }

    if (params.blockNumber !== undefined) {
      whereClauses.push('"blockNumber" = ?');
      queryParams.push(params.blockNumber);
    }

    if (params.blockHash !== undefined) {
      whereClauses.push('"blockHash" = ?');
      queryParams.push(params.blockHash);
    }

    if (params.timestampStart !== undefined) {
      whereClauses.push('"confirmationTimestamp" >= ?');
      queryParams.push(params.timestampStart);
    }

    if (params.timestampEnd !== undefined) {
      whereClauses.push('"confirmationTimestamp" <= ?');
      queryParams.push(params.timestampEnd);
    }

    if (whereClauses.length > 0) {
      query += whereClauses.join(' AND ');

      if (params.order) {
        query += ` ORDER BY "confirmationTimestamp" ${params.order}`;
      }

      if (params.limit) {
        query += ' LIMIT ?';
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

    let query = 'SELECT * FROM block_confirmations2 WHERE ';

    if (blockNumberMin / this.numberPartitionDivider === blockNumberMax / this.numberPartitionDivider) {
      query += '"blockNumberPartition" = ? ';
      queryParams.push(blockNumberMin / this.numberPartitionDivider);
    } else {
      query += '"blockNumberPartition" IN (?, ?) ';
      queryParams.push(blockNumberMin / this.numberPartitionDivider);
      queryParams.push(blockNumberMax / this.numberPartitionDivider);
    }

    query += 'AND "blockNumber" >= ? AND "blockNumber" <= ?';
    queryParams.push(blockNumberMin);
    queryParams.push(blockNumberMax);

    return this.executeQuery(query, queryParams);
  }
}
