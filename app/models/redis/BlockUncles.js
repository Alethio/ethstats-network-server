import AbstractModel from './AbstractModel';

export default class BlockUncles extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = `${this.namespace}:block_uncles`;
  }

  async add(params) {
    params.uncleHash = (params.uncleHash.hash === undefined) ? params.uncleHash : params.uncleHash.hash;

    return this.redis.get(this.table).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      let tableLength = newData.push({
        blockHash: params.blockHash,
        uncleHash: params.uncleHash
      });

      this.redis.set(this.table, JSON.stringify(newData));
      return tableLength;
    });
  }

  async addBatch(blockHash, uncles) {
    return this.redis.get(this.table).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      uncles.forEach(uncleHash => {
        uncleHash = (uncleHash.hash === undefined) ? uncleHash : uncleHash.hash;
        newData.push({
          blockHash: blockHash,
          uncleHash: uncleHash
        });
      });

      this.redis.set(this.table, JSON.stringify(newData));
      return uncles.length;
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
