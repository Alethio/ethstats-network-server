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

  async add(params) {
    let tableLength = this.jsonDB[this.table].push({
      date: params.date,
      difficulty: params.difficulty,
      extraData: params.extraData,
      gasLimit: params.gasLimit,
      gasUsed: params.gasUsed,
      hash: params.hash,
      logsBloom: params.logsBloom,
      miner: params.miner,
      mixHash: params.mixHash,
      nonce: params.nonce,
      number: params.number,
      parentHash: params.parentHash,
      receiptsRoot: params.receiptsRoot,
      sealFields: params.sealFields,
      sha3Uncles: params.sha3Uncles,
      size: params.size,
      stateRoot: params.stateRoot,
      timestamp: params.timestamp,
      totalDifficulty: params.totalDifficulty,
      transactionsRoot: params.transactionsRoot,
      receivedTimestamp: params.receivedTimestamp,
      blockTime: params.blockTime,
      rank: params.rank,
      txCount: params.txCount,
      uncleCount: params.uncleCount
    });

    if (tableLength > this.appConfig.LITE_DB_LIMIT) {
      let oldestBlockNumber = this.lodash.minBy(this.jsonDB[this.table], 'number').number;
      let blocksToRemove = this.lodash.filter(this.jsonDB[this.table], {number: oldestBlockNumber});
      let hashesToRemove = this.lodash.map(blocksToRemove, this.lodash.property('hash'));

      this.lodash.remove(this.jsonDB[this.table], row => {
        return row.number === oldestBlockNumber;
      });

      this.lodash.remove(this.jsonDB.block_confirmations, row => {
        return row.blockNumber === oldestBlockNumber;
      });

      this.lodash.remove(this.jsonDB.block_transactions, row => {
        return hashesToRemove.includes(row.blockHash);
      });

      this.lodash.remove(this.jsonDB.block_uncles, row => {
        return hashesToRemove.includes(row.blockHash);
      });
    }

    return this.jsonDB[this.table].length;
  }

  /*
   * Get block params
   *
   * number
   * hash
   */
  async getBlock(params) {
    let result = null;

    if (this.lodash.isEmpty(params)) {
      return result;
    }

    result = this.jsonDB[this.table];

    if (params.number) {
      result = this.lodash.filter(result, {number: params.number});
    }

    if (params.hash) {
      result = this.lodash.filter(result, {hash: params.hash});
    }

    result = this.lodash.orderBy(result, ['rank'], ['desc']);

    return (result.length > 0) ? result[0] : null;
  }

  async getLastBlockNumber() {
    let blockPartitionKey = this.getNumberPartitionKey(Date.now());
    let lastBlock = this.lodash.maxBy(this.jsonDB[this.table], 'number');

    let result = null;

    if (lastBlock && lastBlock.number) {
      result = {
        date: blockPartitionKey,
        number: (lastBlock.number) ? lastBlock.number : 0
      };
    }

    return result;
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

  async getOlderThanBlockNumber(referenceBlockNumber, referenceBlockPartitionKey, limit) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);
    let blockNumberMin = parseInt(referenceBlockNumber, 10) - parseInt(limit, 10);
    let blockNumberMax = parseInt(referenceBlockNumber, 10);

    let filteredData = this.lodash.filter(this.jsonDB[this.table], row => {
      return row.number >= blockNumberMin && row.number <= blockNumberMax;
    });

    let resultTmp = {};
    if (filteredData && filteredData.length > 0) {
      for (let i = 0; i < filteredData.length; i++) {
        let blockNumber = filteredData[i].number;

        if (resultTmp.blockNumber === undefined) {
          resultTmp[blockNumber] = filteredData[i];
        } else if (filteredData[i].rank > resultTmp[blockNumber].rank ||
          (filteredData[i].rank === resultTmp[blockNumber].rank && filteredData[i].timestamp < resultTmp[blockNumber].timestamp)) {
          resultTmp[blockNumber] = filteredData[i];
        }
      }
    }

    if (Object.keys(resultTmp).length > 0) {
      Object.keys(resultTmp).forEach(blockNumber => {
        returnObject.rows.push(resultTmp[blockNumber]);
      });
    }

    returnObject.rows = this.lodash.orderBy(returnObject.rows, ['number'], ['desc']);
    returnObject.rowLength = returnObject.rows.length;

    return returnObject;
  }

  async getByNumberPartition(numberPartition) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    let filteredData = this.lodash.filter(this.jsonDB[this.table], row => {
      return (Math.floor(row.number / this.numberPartitionDivider) === numberPartition);
    });

    returnObject.rows = this.lodash.orderBy(filteredData, ['number'], ['desc']);
    returnObject.rowLength = returnObject.rows.length;

    return returnObject;
  }
}
