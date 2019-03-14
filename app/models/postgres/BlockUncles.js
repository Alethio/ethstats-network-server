import AbstractModel from './AbstractModel';

export default class BlockUncles extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'block_uncles';
  }

  add(params) {
    params.uncleHash = (params.uncleHash.hash === undefined) ? params.uncleHash : params.uncleHash.hash;

    let query = 'INSERT INTO block_uncles ("blockHash", "uncleHash") VALUES ($1, $2)';
    let queryParams = [
      params.blockHash,
      params.uncleHash
    ];

    return this.executeQuery(query, queryParams);
  }

  addBatch(blockHash, uncles) {
    let result = [];
    let query = 'INSERT INTO block_uncles ("blockHash", "uncleHash") VALUES ';
    let queryPlaceholders = [];
    let queryParams = [];
    let queryParamIdx = 1;

    uncles.forEach(uncleHash => {
      uncleHash = (uncleHash.hash === undefined) ? uncleHash : uncleHash.hash;

      queryPlaceholders.push(`($${queryParamIdx}, $${queryParamIdx + 1})`);
      queryParamIdx += 2;

      queryParams.push(blockHash);
      queryParams.push(uncleHash);
    });

    query += queryPlaceholders.join(', ');

    return this.executeQuery(query, queryParams);
  }

  getByBlockHash(blockHash) {
    let query = 'SELECT * FROM block_uncles WHERE "blockHash" = $1';
    let queryParams = [blockHash];

    return this.executeQuery(query, queryParams);
  }
}
