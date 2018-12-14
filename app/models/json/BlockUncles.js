import AbstractModel from './AbstractModel';

export default class BlockUncles extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'block_uncles';
  }

  async add(params) {
    return this.jsonDB[this.table].push({
      blockHash: params.blockHash,
      uncleHash: params.uncleHash
    });
  }

  async addBatch(blockHash, uncles) {
    uncles.forEach(uncleHash => {
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
