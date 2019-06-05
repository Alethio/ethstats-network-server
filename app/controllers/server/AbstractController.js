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

  clientWrite(spark, topic, payload) {
    let session = this.session.getAll(spark.id);
    let logType = 'info';

    if (payload.errors && payload.errors.length) {
      logType = 'error';
    } else if (payload.warnings && payload.warnings.length) {
      logType = 'warning';
    }

    this.log[logType](`[${spark.id}] - Message sent on topic: ${topic} => payload: ${JSON.stringify(payload)}`);

    let objectToSend = this._formatWriteObject(topic, payload, session.isV1Client);

    if (objectToSend === false) {
      return false;
    }

    return spark.write(objectToSend);
  }

  _formatWriteObject(topic, payload, isV1Client) {
    let result = {topic, payload};

    if (isV1Client === true) {
      switch (topic) {
        case 'loginResponse':
          result = {emit: ['ready']};
          break;
        case 'node-pong':
          result = {emit: ['node-pong', payload]};
          break;
        case 'getBlocks':
          result = {emit: ['history', {list: payload}]};
          break;
        default:
          result = false;
          break;
      }
    }

    return result;
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
      lastLogoutTimestamp: new Date(logoutTimestamp).toISOString()
    }).then(() => {
      return this.models.AuthLogs.update({
        nodeName: nodeName,
        loginTimestamp: new Date(lastLoginTimestamp).toISOString()
      }, {
        logoutTimestamp: new Date(logoutTimestamp).toISOString(),
        onlineTime: sessionOnlineTime
      });
    }).then(() => {
      return responseObject;
    });
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
        this.clientWrite(spark, 'checkChain', {blockNumber: blockNumberToCheck});
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

  async getConfig(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          configName: {type: 'string'}
        },
        required: ['configName']
      }
    };

    let validParams = this.validator.validate(requestValidation.request, params);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    let availableConfigs = ['NETWORK_ALGO'];

    if (!availableConfigs.includes(params.configName)) {
      responseObject.success = false;
      responseObject.errors.push('Config not found');

      return responseObject;
    }

    let session = this.session.getAll(spark.id);
    if (session.isLoggedIn === true) {
      responseObject.data.push({[params.configName]: this.appConfig[params.configName]});
      responseObject.dataLength = responseObject.data.length;
    } else {
      responseObject.success = false;
      responseObject.errors.push('Not logged in');
    }

    return responseObject;
  }
}
