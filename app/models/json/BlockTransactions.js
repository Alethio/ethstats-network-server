import AbstractModel from './AbstractModel';

export default class BlockTransactions extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'block_transactions';
  }

  async add(params) {
    return this.jsonDB[this.table].push({
      blockHash: params.blockHash,
      txHash: params.txHash
    });
  }

  async addBatch(blockHash, transactions) {
    transactions.forEach(txHash => {
      this.jsonDB[this.table].push({
        blockHash: blockHash,
        txHash: txHash
      });
    });

    return transactions.length;
  }

  async getByBlockHash(blockHash) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    returnObject.rows = this.lodash.filter(this.jsonDB[this.table], {blockHash: blockHash});
    returnObject.rowLength = returnObject.rows.length;

    return returnObject;
  }
}
