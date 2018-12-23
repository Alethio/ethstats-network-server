import AbstractModel from './AbstractModel';

export default class BlockTransactions extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = `${this.namespace}:block_transactions`;
  }

  async add(params) {
    params.txHash = (params.txHash.hash === undefined) ? params.txHash : params.txHash.hash;

    return this.redis.get(this.table).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      let tableLength = newData.push({
        blockHash: params.blockHash,
        txHash: params.txHash
      });

      this.redis.set(this.table, JSON.stringify(newData));
      return tableLength;
    });
  }

  async addBatch(blockHash, transactions) {
    return this.redis.get(this.table).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      transactions.forEach(txHash => {
        txHash = (txHash.hash === undefined) ? txHash : txHash.hash;
        newData.push({
          blockHash: blockHash,
          txHash: txHash
        });
      });

      this.redis.set(this.table, JSON.stringify(newData));
      return transactions.length;
    });
  }

  async getByBlockHash(blockHash) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        returnObject.rows = this.lodash.filter(JSON.parse(data), {blockHash: blockHash});
        returnObject.rowLength = returnObject.rows.length;
      }

      return returnObject;
    });
  }
}
