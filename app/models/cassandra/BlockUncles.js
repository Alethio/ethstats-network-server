import AbstractModel from './AbstractModel';

export default class BlockUncles extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'block_uncles';
  }

  add(params) {
    params.uncleHash = (params.uncleHash.hash === undefined) ? params.uncleHash : params.uncleHash.hash;

    let query = 'INSERT INTO block_uncles ("blockHash", "uncleHash") VALUES (?, ?)';
    let queryParams = [
      params.blockHash,
      params.uncleHash
    ];

    return this.executeQuery(query, queryParams);
  }

  addBatch(blockHash, uncles) {
    let result = [];

    this.lodash.map(this.lodash.chunk(uncles, 100), array => {
      let queries = [];
      array.forEach(uncleHash => {
        uncleHash = (uncleHash.hash === undefined) ? uncleHash : uncleHash.hash;
        queries.push({
          query: 'INSERT INTO block_uncles ("blockHash", "uncleHash") VALUES (?, ?)',
          params: [blockHash, uncleHash]
        });
      });

      result.push(this.executeBatch(queries));
    });

    return result;
  }

  getByBlockHash(blockHash) {
    let query = 'SELECT * FROM block_uncles WHERE "blockHash" = ?';
    let queryParams = [blockHash];

    return this.executeQuery(query, queryParams);
  }
}
