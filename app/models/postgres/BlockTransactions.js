import AbstractModel from './AbstractModel';

export default class BlockTransactions extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'block_transactions';
  }

  add(params) {
    params.txHash = (params.txHash.hash === undefined) ? params.txHash : params.txHash.hash;

    let query = 'INSERT INTO block_transactions ("blockHash", "txHash") VALUES ($1, $2)';
    let queryParams = [
      params.blockHash,
      params.txHash
    ];

    return this.executeQuery(query, queryParams);
  }

  addBatch(blockHash, transactions) {
    let result = [];
    let query = 'INSERT INTO block_transactions ("blockHash", "txHash") VALUES ';
    let queryPlaceholders = [];
    let queryParams = [];
    let queryParamIdx = 1;

    transactions.forEach(txHash => {
      txHash = (txHash.hash === undefined) ? txHash : txHash.hash;

      queryPlaceholders.push(`($${queryParamIdx}, $${queryParamIdx + 1})`);
      queryParamIdx += 2;

      queryParams.push(blockHash);
      queryParams.push(txHash);
    });

    query += queryPlaceholders.join(', ');

    return this.executeQuery(query, queryParams);
  }

  getByBlockHash(blockHash) {
    let query = 'SELECT * FROM block_transactions WHERE "blockHash" = $1';
    let queryParams = [blockHash];

    return this.executeQuery(query, queryParams);
  }
}
