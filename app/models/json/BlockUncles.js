import AbstractModel from './AbstractModel';

export default class BlockUncles extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'block_uncles';
  }

  async add(params) {
    params.uncleHash = (params.uncleHash.hash === undefined) ? params.uncleHash : params.uncleHash.hash;

    return this.jsonDB[this.table].push({
      blockHash: params.blockHash,
      uncleHash: params.uncleHash
    });
  }

  async addBatch(blockHash, uncles) {
    uncles.forEach(uncleHash => {
      uncleHash = (uncleHash.hash === undefined) ? uncleHash : uncleHash.hash;
      this.jsonDB[this.table].push({
        blockHash: blockHash,
        uncleHash: uncleHash
      });
    });

    return uncles.length;
  }

  async getByBlockHash(blockHash) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    returnObject.rows = this.lodash.filter(this.jsonDB[this.table], {blockHash: blockHash});
    returnObject.rowLength = returnObject.rows.length;

    return returnObject;
  }
}
