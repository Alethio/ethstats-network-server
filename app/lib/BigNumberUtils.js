import BigNumber from 'bignumber.js';

export default class BigNumberUtils {
  static isLong(value) {
    return (value && value.__isLong__) === true;
  }

  static newBigNumber(value) {
    return new BigNumber(value);
  }

  static getInt(value) {
    return new BigNumber(value).toString(10);
  }

  static getHex(value, prepend0x = false) {
    return `${prepend0x ? '0x' : ''}${new BigNumber(value).toString(16)}`;
  }
}
