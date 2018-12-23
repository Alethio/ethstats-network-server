import AbstractModel from './AbstractModel';

export default class BlockTransactions extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'block_transactions';
  }

  add(params) {
    params.txHash = (params.txHash.hash === undefined) ? params.txHash : params.txHash.hash;

    let query = 'INSERT INTO block_transactions ("blockHash", "txHash") VALUES (?, ?)';
    let queryParams = [
      params.blockHash,
      params.txHash
    ];

    return this.executeQuery(query, queryParams);
  }

  addBatch(blockHash, transactions) {
    let result = [];

    this.lodash.map(this.lodash.chunk(transactions, 100), array => {
      let queries = [];
      array.forEach(txHash => {
        txHash = (txHash.hash === undefined) ? txHash : txHash.hash;
        queries.push({
          query: 'INSERT INTO block_transactions ("blockHash", "txHash") VALUES (?, ?)',
          params: [blockHash, txHash]
        });
      });

      result.push(this.executeBatch(queries));
    });

    return result;
  }

  getByBlockHash(blockHash) {
    let query = 'SELECT * FROM block_transactions WHERE "blockHash" = ?';
    let queryParams = [blockHash];

    return this.executeQuery(query, queryParams);
  }
}
