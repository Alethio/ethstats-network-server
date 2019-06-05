import dictionary from './EthonDictionary.js';

export default class Result {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.geoIp = diContainer.geoIp;
    this.bigNumberUtils = diContainer.bigNumberUtils;
    this.dictionary = dictionary;
  }

  _ethonize(value) {
    return this.dictionary[value] === undefined ? value : this.dictionary[value];
  }

  formatData(value) {
    let result = {};

    if (this.lodash.isString(value)) {
      if (value.includes('.')) {
        result = this.lodash.map(value.split('.'), element => {
          return this._ethonize(element);
        });
        result = result.join('.');
      } else {
        result = this._ethonize(value);
      }
    } else if (this.lodash.isBoolean(value)) {
      result = value;
    } else if (this.lodash.isNull(value)) {
      result = value;
    } else if (this.lodash.isNumber(value)) {
      result = value;
    } else if (this.lodash.isDate(value)) {
      result = value;
    } else if (this.lodash.isArray(value)) {
      let resultArray = [];
      for (let i = 0; i < value.length; i++) {
        if (value[i] && !this.lodash.isDate(value[i]) && !this.lodash.isFunction(value[i]) && this.lodash.isObject(value[i])) {
          resultArray.push(this.formatData(value[i]));
        } else {
          resultArray.push(value[i]);
        }
      }

      result = resultArray;
    } else if (this.lodash.isObject(value)) {
      if (this.bigNumberUtils.isLong(value)) {
        result = this.bigNumberUtils.getInt(value);
      } else {
        for (var property in value) {
          if (value[property] !== undefined) {
            if (value[property] && !this.lodash.isDate(value[property]) && !this.lodash.isFunction(value[property]) && this.lodash.isObject(value[property])) {
              result[this._ethonize(property)] = this.formatData(value[property]);
            } else {
              result[this._ethonize(property)] = value[property];
            }
          }
        }
      }
    }

    return result;
  }

  setupNodeData(data, calculateOnlineTimePercent) {
    let returnObject = {
      nodeData: {
        isActive: data.nodeData.isActive,
        nodeName: data.nodeData.nodeName
      },
      nodeSyncInfo: null,
      nodeStatistics: null,
      nodeBlockData: null,
      nodeUsage: null
    };

    if (['ibft2', 'clique'].includes(this.appConfig.NETWORK_ALGO)) {
      returnObject.nodeData.isValidator = false;
    }

    if (data && data.firstLogin && data.lastLogin) {
      let onlineTimePercent = 0;

      if (calculateOnlineTimePercent) {
        let totalOnlineTime = this.bigNumberUtils.newBigNumber(data.nodeData.totalOnlineTime);
        let firstLoginTimestamp = new Date(data.firstLogin.loginTimestamp).getTime();
        let lastLogoutTimestamp = data.lastLogin.logoutTimestamp ? new Date(data.lastLogin.logoutTimestamp).getTime() : new Date(data.nodeData.lastActivityTimestamp).getTime();
        onlineTimePercent = totalOnlineTime.dividedBy(lastLogoutTimestamp - firstLoginTimestamp).multipliedBy(100).toFixed(2);
        onlineTimePercent = Math.max(0, Math.min(100, onlineTimePercent));
      }

      let ipv4 = data.lastLogin.ip.split(':').pop();
      let geoIpData = this.geoIp.lookup(ipv4);

      returnObject.nodeData.coinbase = data.lastLogin.coinbase;
      returnObject.nodeData.node = data.lastLogin.node;
      returnObject.nodeData.net = data.lastLogin.net;
      returnObject.nodeData.protocol = data.lastLogin.protocol;
      returnObject.nodeData.api = data.lastLogin.api;
      returnObject.nodeData.os = data.lastLogin.os;
      returnObject.nodeData.osVersion = data.lastLogin.osVersion;
      returnObject.nodeData.client = data.lastLogin.client;
      returnObject.nodeData.cpu = data.lastLogin.cpu;
      returnObject.nodeData.memory = data.lastLogin.memory;
      returnObject.nodeData.disk = data.lastLogin.disk;
      returnObject.nodeData.wsLatency = 0;
      returnObject.nodeData.onlineTimePercent = onlineTimePercent;
      returnObject.nodeData.firstLoginTimestamp = data.firstLogin.loginTimestamp;
      returnObject.nodeData.geoPoint = (geoIpData === null) ? geoIpData : geoIpData.ll.join(' '); // http://www.georss.org/georss/
    }

    if (data && data.lastSync) {
      returnObject.nodeSyncInfo = {
        syncOperation: data.lastSync.syncOperation,
        startingBlock: data.lastSync.startingBlock,
        currentBlock: data.lastSync.currentBlock,
        highestBlock: data.lastSync.highestBlock
      };
    }

    if (data && data.lastStat) {
      returnObject.nodeData.wsLatency = data.lastStat.wsLatency;
      returnObject.nodeStatistics = {
        isMining: data.lastStat.isMining,
        hashrate: data.lastStat.hashrate,
        peerCount: data.lastStat.peerCount,
        gasPrice: data.lastStat.gasPrice
      };
    }

    let propagationTimes = [];
    let propagationSum = 0;
    let propagationAvg = 0;
    if (data && data.lastConfirmations) {
      for (let i = data.lastConfirmations.length - 1; i >= 0; i--) {
        propagationSum += parseInt(data.lastConfirmations[i].propagationTime, 10);
        propagationTimes.push(parseInt(data.lastConfirmations[i].propagationTime, 10));
      }

      propagationAvg = propagationSum / data.lastConfirmations.length;
    }

    let missingBins = this.appConfig.CHARTS_NODE_BLOCK_PROPAGATION_MAX_BINS - propagationTimes.length;
    if (missingBins > 0) {
      for (let i = 0; i < missingBins; i++) {
        propagationTimes.unshift(0);
      }
    }

    if (data && data.lastBlock) {
      returnObject.nodeBlockData = {
        number: data.lastBlock.number,
        hash: data.lastBlock.hash,
        difficulty: data.lastBlock.difficulty,
        totalDifficulty: data.lastBlock.totalDifficulty,
        gasLimit: data.lastBlock.gasLimit,
        timestamp: new Date(data.lastBlock.timestamp * 1000),
        receivedTimestamp: data.lastBlock.receivedTimestamp,
        confirmationTimestamp: data.lastConfirmations[0].confirmationTimestamp,
        blockTime: data.lastBlock.blockTime,
        txCount: data.lastBlock.txCount,
        uncleCount: data.lastBlock.uncleCount,
        propagationData: {
          propagationTime: parseInt(data.lastConfirmations[0].propagationTime, 10),
          propagationAverage: propagationAvg,
          propagationChartData: propagationTimes
        }
      };

      if (['ibft2', 'clique'].includes(this.appConfig.NETWORK_ALGO) && data.lastBlock.validators) {
        if (data.lastBlock.validators.includes(returnObject.nodeData.coinbase)) {
          returnObject.nodeData.isValidator = true;
        }
      }
    }

    if (data && data.lastUsage) {
      returnObject.nodeUsage = {
        hostCpuLoad: parseFloat(data.lastUsage.hostCpuLoad),
        hostMemTotal: parseFloat(data.lastUsage.hostMemTotal),
        hostMemUsed: parseFloat(data.lastUsage.hostMemUsed),
        hostNetRxSec: parseFloat(data.lastUsage.hostNetRxSec),
        hostNetTxSec: parseFloat(data.lastUsage.hostNetTxSec),
        hostFsRxSec: parseFloat(data.lastUsage.hostFsRxSec),
        hostFsWxSec: parseFloat(data.lastUsage.hostFsWxSec),
        hostDiskRIOSec: parseFloat(data.lastUsage.hostDiskRIOSec),
        hostDiskWIOSec: parseFloat(data.lastUsage.hostDiskWIOSec),
        nodeCpuLoad: parseFloat(data.lastUsage.nodeCpuLoad),
        nodeMemLoad: parseFloat(data.lastUsage.nodeMemLoad),
        clientCpuLoad: parseFloat(data.lastUsage.clientCpuLoad),
        clientMemLoad: parseFloat(data.lastUsage.clientMemLoad)
      };
    }

    return returnObject;
  }
}
