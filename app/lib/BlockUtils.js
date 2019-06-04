import * as rlp from 'rlp';

export default class BlockUtils {
  static getIBFT2Validators(block) {
    let validators = [];

    if (block.extraData) {
      try {
        let decodedExtraData = rlp.decode(block.extraData);
        let validatorsRaw = decodedExtraData[1] || [];

        validatorsRaw.forEach(validator => {
          validators.push('0x' + validator.toString('hex'));
        });
      } catch (error) {
        this.log.error(`Could not decode IBFT2 extraData to get validators for block ${block.number}::${block.hash} => ${error.message}`);
      }
    }

    return validators;
  }
}
