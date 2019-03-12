import AbstractModel from './AbstractModel';

export default class Blocks extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'blocks';
    this.numberPartitionDivider = 10000;
  }

  getNumberPartitionKey(timestamp) {
    let blockTimestamp = new Date(parseInt(timestamp, 10));
    let year = blockTimestamp.getFullYear().toString();
    let month = ('0' + (blockTimestamp.getMonth() + 1).toString()).slice(-2);
    let day = ('0' + blockTimestamp.getDate().toString()).slice(-2);

    return year + month + day;
  }

  alterNumberPartitionKey(partitionKey, days) {
    let year = partitionKey.toString().substr(0, 4);
    let month = partitionKey.toString().substr(4, 2);
    let day = partitionKey.toString().substr(6, 2);
    let timestamp = parseInt(Date.parse(`${year}-${month}-${day}`), 10) + (86400000 * days);

    return this.getNumberPartitionKey(timestamp);
  }

  add(params) {
    let query = `INSERT INTO blocks (
      "date",
      "difficulty",
      "extraData",
      "gasLimit",
      "gasUsed",
      "hash",
      "logsBloom",
      "miner",
      "mixHash",
      "nonce",
      "number",
      "parentHash",
      "receiptsRoot",
      "sealFields",
      "sha3Uncles",
      "size",
      "stateRoot",
      "timestamp",
      "totalDifficulty",
      "transactionsRoot",
      "receivedTimestamp",
      "blockTime",
      "rank",
      "txCount",
      "uncleCount"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`;

    let queryParams = [
      params.date,
      params.difficulty,
      params.extraData,
      params.gasLimit,
      params.gasUsed,
      params.hash,
      params.logsBloom,
      params.miner,
      params.mixHash,
      params.nonce,
      params.number,
      params.parentHash,
      params.receiptsRoot,
      params.sealFields,
      params.sha3Uncles,
      params.size,
      params.stateRoot,
      params.timestamp,
      params.totalDifficulty,
      params.transactionsRoot,
      new Date(params.receivedTimestamp).toISOString(),
      params.blockTime,
      params.rank,
      params.txCount,
      params.uncleCount
    ];

    return this.executeQuery(query, queryParams);
  }

  /*
   * Get block params
   *
   * number
   * hash
   */
  getBlock(params) {
    let query = 'SELECT * FROM blocks WHERE "number" = $1';
    let queryParams = [params.number];

    if (params.hash !== undefined) {
      query += ' AND "hash" = $2';
      queryParams.push(params.hash);
    }

    return this.executeQuery(query, queryParams).then(data => {
      let queryResult = null;
      if (data && data.rowLength > 0) {
        queryResult = this.lodash.orderBy(data.rows, ['rank'], ['desc']);
        queryResult = queryResult[0];
      }

      return queryResult;
    });
  }

  getLastBlockNumber() {
    let blockPartitionKey = this.getNumberPartitionKey(Date.now());

    let query = `SELECT max("number") as "lastBlockNumber" FROM ${this.table}`;
    let queryParams = [];

    return this.executeQuery(query, queryParams).then(data => {
      let result = null;

      if (data && data.rowLength > 0) {
        result = {
          date: blockPartitionKey,
          number: (data.rows[0].lastBlockNumber === null) ? 0 : data.rows[0].lastBlockNumber
        };
      }

      return result;
    });
  }

  getLastBlockData() {
    return this.getLastBlockNumber().then(lastBlockNumber => {
      let result = null;

      if (lastBlockNumber !== null) {
        result = this.getBlock({number: lastBlockNumber.number});
      }

      return result;
    });
  }

  getOlderThanBlockNumber(referenceBlockNumber, referenceBlockPartitionKey, limit) {
    let result = {
      rowLength: 0,
      rows: []
    };

    let blockNumberMin = parseInt(referenceBlockNumber, 10) - parseInt(limit, 10);
    let blockNumberMax = parseInt(referenceBlockNumber, 10);

    let query = `SELECT * FROM ${this.table} WHERE "number" >= $1 AND "number" <= $2`;
    let queryParams = [blockNumberMin, blockNumberMax];

    return this.executeQuery(query, queryParams).then(data => {
      let resultTmp = {};

      if (data && data.rowLength > 0) {
        for (let i = 0; i < data.rowLength; i++) {
          let blockNumber = data.rows[i].number;

          if (resultTmp.blockNumber === undefined) {
            resultTmp[blockNumber] = data.rows[i];
          } else if (data.rows[i].rank > resultTmp[blockNumber].rank ||
            (data.rows[i].rank === resultTmp[blockNumber].rank && data.rows[i].timestamp < resultTmp[blockNumber].timestamp)) {
            resultTmp[blockNumber] = data.rows[i];
          }
        }
      }

      if (Object.keys(resultTmp).length > 0) {
        Object.keys(resultTmp).forEach(blockNumber => {
          result.rows.push(resultTmp[blockNumber]);
        });
      }

      result.rowLength = result.rows.length;
      result.rows = this.lodash.orderBy(result.rows, ['number'], ['desc']);

      return result;
    });
  }

  getByNumberPartition(numberPartition) {
    let query = 'SELECT * FROM blocks WHERE "number" / $1 = $2';
    let queryParams = [this.numberPartitionDivider, numberPartition];

    return this.executeQuery(query, queryParams);
  }
}
