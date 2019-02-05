import AbstractModel from './AbstractModel';

export default class Blocks extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = `${this.namespace}:blocks`;
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
    return this.redis.get(this.table).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      let tableLength = newData.push({
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
        let oldestBlockNumber = this.lodash.minBy(newData, 'number').number;
        let blocksToRemove = this.lodash.filter(newData, {number: oldestBlockNumber});
        let hashesToRemove = this.lodash.map(blocksToRemove, this.lodash.property('hash'));

        this.lodash.remove(newData, row => {
          return row.number === oldestBlockNumber;
        });

        return Promise.all([
          this.removeBlockConfirmations(oldestBlockNumber),
          this.removeBlockTransactions(hashesToRemove),
          this.removeBlockUncles(hashesToRemove)
        ]).then(() => {
          return this.redis.set(this.table, JSON.stringify(newData)).then(() => {
            return newData.length;
          });
        });
      }

      return this.redis.set(this.table, JSON.stringify(newData)).then(() => {
        return newData.length;
      });
    });
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

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        result = JSON.parse(data);

        if (params.number) {
          result = this.lodash.filter(result, {number: params.number});
        }

        if (params.hash) {
          result = this.lodash.filter(result, {hash: params.hash});
        }

        result = this.lodash.orderBy(result, ['rank'], ['desc']);
      }

      return (result && result.length > 0) ? result[0] : null;
    });
  }

  async getLastBlockNumber() {
    let blockPartitionKey = this.getNumberPartitionKey(Date.now());
    let result = null;

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        let lastBlock = this.lodash.maxBy(JSON.parse(data), 'number');

        if (lastBlock && lastBlock.number) {
          result = {
            date: blockPartitionKey,
            number: (lastBlock.number) ? lastBlock.number : 0
          };
        }
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

  async getOlderThanBlockNumber(referenceBlockNumber, referenceBlockPartitionKey, limit) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);
    let blockNumberMin = parseInt(referenceBlockNumber, 10) - parseInt(limit, 10);
    let blockNumberMax = parseInt(referenceBlockNumber, 10);

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        let filteredData = this.lodash.filter(JSON.parse(data), row => {
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
      }

      return returnObject;
    });
  }

  removeBlockConfirmations(blockNumber) {
    return this.redis.get(`${this.namespace}:block_confirmations`).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      this.lodash.remove(newData, row => {
        return row.blockNumber === blockNumber;
      });
      return newData;
    }).then(newData => {
      return this.redis.set(`${this.namespace}:block_confirmations`, JSON.stringify(newData));
    });
  }

  removeBlockTransactions(blockHashes) {
    return this.redis.get(`${this.namespace}:block_transactions`).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      this.lodash.remove(newData, row => {
        return blockHashes.includes(row.blockHash);
      });
      return newData;
    }).then(newData => {
      return this.redis.set(`${this.namespace}:block_transactions`, JSON.stringify(newData));
    });
  }

  removeBlockUncles(blockHashes) {
    return this.redis.get(`${this.namespace}:block_uncles`).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      this.lodash.remove(newData, row => {
        return blockHashes.includes(row.blockHash);
      });
      return newData;
    }).then(newData => {
      return this.redis.set(`${this.namespace}:block_uncles`, JSON.stringify(newData));
    });
  }

  async getByNumberPartition(numberPartition) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        let filteredData = this.lodash.filter(JSON.parse(data), row => {
          return (Math.floor(row.number / this.numberPartitionDivider) === numberPartition);
        });

        returnObject.rows = this.lodash.orderBy(filteredData, ['number'], ['desc']);
        returnObject.rowLength = returnObject.rows.length;
      }

      return returnObject;
    });
  }
}
