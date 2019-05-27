import * as rlp from 'rlp';

export default class BlockUtils {
  static getValidators(networkAlgo, extraData) {
    let validators = [];

    if (networkAlgo === 'ibft2') {
      let decodedExtraData = rlp.decode(extraData);
      let validatorsRaw = decodedExtraData[1] || [];

      validatorsRaw.forEach(validator => {
        validators.push('0x' + validator.toString('hex'));
      });
    }

    return validators;
  }
}
