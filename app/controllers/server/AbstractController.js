import dictionary from '../../lib/EthonDictionary.js';

export default class AbstractController {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.cache = diContainer.cache;
    this.session = diContainer.session;
    this.lodash = diContainer.lodash;
    this.geoIp = diContainer.geoIp;
    this.log = diContainer.logger;
    this.kafkaProducer = diContainer.kafkaProducer;
    this.validator = diContainer.validator;
    this.validatorError = diContainer.validatorError;
    this.sha1 = diContainer.sha1;
    this.compareVersions = diContainer.compareVersions;
    this.models = diContainer.models;
    this.deepstream = diContainer.deepstream;
    this.dsDataLoader = diContainer.dsDataLoader;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.result = diContainer.result;
    this.mailer = diContainer.mailer;
    this.infura = diContainer.infura;
    this.kafkaUtils = diContainer.kafkaUtils;
    this.bigNumberUtils = diContainer.bigNumberUtils;

    this.responseObject = {
      success: true,
      data: [],
      dataLength: 0,
      warnings: [],
      errors: []
    };
  }

  clientClose(spark) {
    spark.end();
    this.log.info(`[${spark.id}] - Client disconnected`);
  }

  clientWrite(spark, topic, message) {
    let session = this.session.getAll(spark.id);
    let logType = 'info';
    let nodeName = '';

    if (message.success !== undefined && message.data !== undefined) {
      nodeName = (message.data.length && message.data[0].nodeName) ? `for node '${message.data[0].nodeName}' ` : '';
    }

    if (message.errors && message.errors.length) {
      logType = 'error';
    } else if (message.warnings && message.warnings.length) {
      logType = 'warning';
    }

    this.log[logType](`[${spark.id}] - Data sent ${nodeName}on topic: ${topic} => message: ${JSON.stringify(message)}`);

    let objectToSend = this._formatWriteObject(topic, message, session.isV1Client);

    if (objectToSend === false) {
      return false;
    }

    return spark.write(objectToSend);
  }

  _formatWriteObject(topic, message, isV1Client) {
    let result = {topic, message};

    if (isV1Client === true) {
      switch (topic) {
        case 'loginResponse':
          result = {emit: ['ready']};
          break;
        case 'node-pong':
          result = {emit: ['node-pong', message]};
          break;
        case 'history':
          result = {emit: ['history', {list: message}]};
          break;
        default:
          result = false;
          break;
      }
    }

    return result;
  }

  sendLatencyToDeepstream(spark) {
    let session = this.session.getAll(spark.id);
    if (session.isLoggedIn === true) {
      this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${session.nodeName}/nodeData`, 'nodeData.wsLatency', session.latency);
    }
  }

  async logout(spark) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let session = this.session.getAll(spark.id);
    let nodeName = session.nodeName;

    responseObject.data.push({
      nodeName
    });
    responseObject.dataLength = responseObject.data.length;

    if (!session.isLoggedIn) {
      responseObject.success = false;
      responseObject.errors.push('Not logged in');
      return responseObject;
    }

    let logoutTimestamp = Date.now();
    let lastLoginTimestamp = parseInt(session.lastLoginTimestamp, 10);
    let sessionOnlineTime = logoutTimestamp - lastLoginTimestamp;

    this.session.setVar(spark.id, 'isLoggedIn', false);
    this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${nodeName}/nodeData`, 'nodeData.isActive', false);

    let dsNodeCountId = `${this.appConfig.DEEPSTREAM_NAMESPACE}/stats/nodeCountData`;
    this.dsDataLoader.getRecord(dsNodeCountId).whenReady(record => {
      let activeNodeCount = parseInt(record.get()[dictionary.nodeCountData].active, 10);

      if (activeNodeCount > 0) {
        this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/stats/nodeCountData`, 'nodeCountData', {
          active: activeNodeCount - 1
        });
      }
    });

    return this.models.Nodes.update({
      nodeShard: nodeName.charAt(0).toLowerCase(),
      nodeName: nodeName
    }, {
      isActive: false,
      lastLogoutTimestamp: logoutTimestamp
    }).then(() => {
      return this.models.AuthLogs.update({
        nodeName: nodeName,
        loginTimestamp: lastLoginTimestamp
      }, {
        logoutTimestamp: logoutTimestamp,
        onlineTime: sessionOnlineTime
      });
    }).then(() => {
      return responseObject;
    });
  }

  setLastActivityTimestamp(spark) {
    let session = this.session.getAll(spark.id);

    if (session.isLoggedIn === true) {
      let nodeName = session.nodeName;
      let totalOnlineTime = session.totalOnlineTime;
      let firstLoginTimestamp = parseInt(session.firstLoginTimestamp, 10);
      let lastActivityTimestamp = session.lastActivityTimestamp || 0;
      let currentTimestamp = Date.now();

      // throttle last activity once every 1 minute
      if (currentTimestamp - lastActivityTimestamp >= 60000) {
        totalOnlineTime = totalOnlineTime.plus((lastActivityTimestamp === 0) ? 0 : currentTimestamp - lastActivityTimestamp);
        this.session.setVar(spark.id, 'totalOnlineTime', totalOnlineTime);

        let onlineTimePercent = totalOnlineTime.dividedBy(currentTimestamp - firstLoginTimestamp).multipliedBy(100).toFixed(2);
        onlineTimePercent = Math.max(0, Math.min(100, onlineTimePercent));
        this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${session.nodeName}/nodeData`, 'nodeData.onlineTimePercent', onlineTimePercent);

        this.session.setVar(spark.id, 'lastActivityTimestamp', currentTimestamp);
        this.models.Nodes.update({
          nodeShard: nodeName.charAt(0).toLowerCase(),
          nodeName: nodeName
        }, {
          lastActivityTimestamp: currentTimestamp,
          totalOnlineTime: totalOnlineTime.toString(10)
        });
      }
    }
  }

  requestCheckChain(spark, params) {
    let session = this.session.getAll(spark.id);

    if (!session.isV1Client && this.appConfig.CHAIN_DETECTION_ENABLED) {
      let receivedBlockNumber = parseInt(params.receivedBlockNumber, 10);
      let checkChainLastRequestedBlockNumber = (params.checkChainLastRequestedBlockNumber === undefined) ? null : parseInt(params.checkChainLastRequestedBlockNumber, 10);
      let chainDetectionRate = (checkChainLastRequestedBlockNumber === null) ? 0 : params.chainDetectionRate;
      let checkChainRequestCount = parseInt(params.checkChainRequestCount, 10) || 0;

      if ((checkChainLastRequestedBlockNumber === null || receivedBlockNumber > checkChainLastRequestedBlockNumber) && receivedBlockNumber - checkChainLastRequestedBlockNumber >= chainDetectionRate) {
        let blockNumberToCheck = receivedBlockNumber - chainDetectionRate;
        this.log.debug(`[${spark.id}] - Check chain request: ${blockNumberToCheck}`);
        this.clientWrite(spark, 'checkChainRequest', blockNumberToCheck);
        this.session.setVar(spark.id, 'checkChainLastRequestedBlockNumber', receivedBlockNumber);
        this.session.incVar(spark.id, 'checkChainRequestCount', 1);
        checkChainRequestCount += 1;
      }

      if (checkChainRequestCount >= this.appConfig.CHAIN_DETECTION_CLIENT_RESPONSE_MAX_DIFF) {
        let responseObject = this.lodash.cloneDeep(this.responseObject);
        responseObject.success = false;
        responseObject.errors.push(`No check chain responses for the last ${this.appConfig.CHAIN_DETECTION_CLIENT_RESPONSE_MAX_DIFF} requests`);

        this.clientWrite(spark, 'checkChainResponse', responseObject);

        this.logout(spark).then(() => {
          this.clientClose(spark);
        });
      }
    }
  }
}
