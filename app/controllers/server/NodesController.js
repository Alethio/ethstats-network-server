import AbstractController from './AbstractController.js';
import NodeRecoveryRequestView from '../../views/mail/NodeRecoveryRequestView.js';
import NodeRegisterView from '../../views/mail/NodeRegisterView.js';

export default class NodesController extends AbstractController {
  async add(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          accountEmail: {type: 'string', format: 'email'},
          nodeName: {type: 'string', pattern: '^[a-zA-Z0-9-_]{3,64}$'}
        },
        required: ['accountEmail', 'nodeName']
      }
    };
    let resultData = {
      accountEmail: params.accountEmail,
      nodeName: params.nodeName
    };

    let validParams = this.validator.validate(requestValidation.request, params);
    if (!validParams) {
      responseObject.data.push(resultData);
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    let nodeExists = await this.models.Nodes.getByNodeName(params.nodeName).then(data => {
      let result = false;
      if (data && data.rowLength > 0) {
        result = true;
      }

      return result;
    });

    if (nodeExists) {
      responseObject.data.push(resultData);
      responseObject.success = false;
      responseObject.errors.push('Node already registered');
    } else {
      let secretKey = this.sha1(params.nodeName + spark.id + Date.now());
      let nodeParams = {
        accountEmail: params.accountEmail.trim(),
        nodeName: params.nodeName.trim(),
        secretKey: this.sha1(secretKey),
        lastIp: spark.address.ip
      };

      this.log.debug(`[${spark.id}] - DB insert node => ${JSON.stringify(nodeParams)}`);
      this.models.Nodes.add(nodeParams);

      let mailTemplate = new NodeRegisterView({
        networkName: this.appConfig.NETWORK_NAME,
        nodeName: nodeParams.nodeName,
        secretKey: undefined,
        showGethHelp: false
      });

      let mailParams = {
        from: mailTemplate.from,
        to: nodeParams.accountEmail,
        subject: mailTemplate.subject,
        'h:Reply-To': mailTemplate['h:Reply-To'],
        html: mailTemplate.html
      };

      this.log.debug(`[${spark.id}] - Send node register mail to '${nodeParams.accountEmail}', nodeName => '${nodeParams.nodeName}'`);
      this.mailer.sendMail(mailParams);

      resultData.secretKey = secretKey;
      responseObject.data.push(resultData);
    }

    responseObject.dataLength = responseObject.data.length;

    return responseObject;
  }

  async checkIfNodeExists(spark, params) {
    this.log.debug(`[${spark.id}] - Check if node exists '${params.nodeName}'`);

    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nodeName: {type: 'string', pattern: '^[a-zA-Z0-9-_]{3,64}$'}
        },
        required: ['nodeName']
      }
    };

    let validParams = this.validator.validate(requestValidation.request, params);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    let nodeExists = await this.models.Nodes.getByNodeName(params.nodeName).then(data => {
      let result = false;
      if (data && data.rowLength > 0) {
        result = true;
      }

      return result;
    });

    responseObject.data.push({exists: nodeExists});
    responseObject.dataLength = responseObject.data.length;

    return responseObject;
  }

  async checkIfEmailExists(spark, params) {
    this.log.debug(`[${spark.id}] - Check if email exists '${params.accountEmail}'`);

    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          accountEmail: {type: 'string', format: 'email'}
        },
        required: ['accountEmail']
      }
    };

    let validParams = this.validator.validate(requestValidation.request, params);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    let emailExists = await this.models.Nodes.getByAccountEmail(params.accountEmail).then(data => {
      let result = false;
      if (data.rowLength > 0) {
        result = true;
      }

      return result;
    });

    responseObject.data.push({exists: emailExists});
    responseObject.dataLength = responseObject.data.length;

    return responseObject;
  }

  async checkIfNodeRecoveryHashExists(spark, params) {
    this.log.debug(`[${spark.id}] - Check if node recovery hash exists '${params.nodeRecoveryHash}', recoveryRequestId => '${params.recoveryRequestId}'`);

    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          recoveryRequestId: {type: 'string', pattern: '^[a-z0-9]{40}$'},
          nodeRecoveryHash: {type: 'string', pattern: '^[a-z0-9]{10}$'}
        },
        required: ['recoveryRequestId', 'nodeRecoveryHash']
      }
    };

    let validParams = this.validator.validate(requestValidation.request, params);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    let hashExists = await this.models.NodeRecoveryRequests.get({
      recoveryRequestId: params.recoveryRequestId,
      recoveryHash: params.nodeRecoveryHash
    }).then(data => {
      let result = false;
      if (data && data.rowLength > 0) {
        let nowTs = Date.now();
        let createdTs = new Date(data.rows[0].createdTimestamp).getTime();

        if (nowTs - createdTs <= this.appConfig.RECOVERY_HASH_EXPIRE * 1000) {
          result = true;
        }
      }

      return result;
    });

    responseObject.data.push({exists: hashExists});
    responseObject.dataLength = responseObject.data.length;

    return responseObject;
  }

  async sendRecoveryEmail(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          accountEmail: {type: 'string', format: 'email'}
        },
        required: ['accountEmail']
      }
    };

    let validParams = this.validator.validate(requestValidation.request, params);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    await this.models.Nodes.getByAccountEmail(params.accountEmail).then(data => {
      if (data.rowLength === 0) {
        responseObject.success = false;
        responseObject.errors.push('Email does not exist');

        return responseObject;
      }
    });

    let nodes = await this.models.Nodes.getByAccountEmail(params.accountEmail).then(data => {
      let result = null;

      if (data.rowLength > 0) {
        result = data.rows;
      }

      return result;
    });

    if (nodes && nodes.length > 0) {
      let createdTimestamp = Date.now();
      let recoveryRequestId = this.sha1(params.accountEmail + createdTimestamp);
      let getUniqueHash = () => {
        let result = '';
        let possible = 'abcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < 10; i++) {
          result += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return result;
      };

      let recoveryHashes = [];

      this.lodash.each(nodes, nodeData => {
        let recoveryRequest = {
          recoveryRequestId: recoveryRequestId,
          accountEmail: params.accountEmail,
          nodeName: nodeData.nodeName,
          recoveryHash: getUniqueHash(),
          createdTimestamp: createdTimestamp
        };

        recoveryHashes.push(recoveryRequest);

        this.models.NodeRecoveryRequests.add(recoveryRequest);
        this.log.debug(`[${spark.id}] - DB insert node_recovery_requests => ${JSON.stringify(recoveryRequest)}`);
      });

      let mailTemplate = new NodeRecoveryRequestView({
        recoveryHashes: this.lodash.orderBy(recoveryHashes, ['nodeName'], ['asc']),
        hashExpire: this.appConfig.RECOVERY_HASH_EXPIRE / 60
      });

      let mailParams = {
        from: mailTemplate.from,
        to: params.accountEmail,
        subject: mailTemplate.subject,
        'h:Reply-To': mailTemplate['h:Reply-To'],
        html: mailTemplate.html
      };
      this.log.debug(`[${spark.id}] - Send node recovery request mail to '${params.accountEmail}', recoveryRequestId => '${recoveryRequestId}'`);
      this.mailer.sendMail(mailParams);

      responseObject.data.push({recoveryRequestId});
      responseObject.dataLength = responseObject.data.length;
    } else {
      responseObject.success = false;
      responseObject.errors.push('Email account does not have registered nodes');
    }

    return responseObject;
  }

  async recoverNode(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          recoveryRequestId: {type: 'string', pattern: '^[a-z0-9]{40}$'},
          nodeRecoveryHash: {type: 'string', pattern: '^[a-z0-9]{10}$'}
        },
        required: ['recoveryRequestId', 'nodeRecoveryHash']
      }
    };

    let validParams = this.validator.validate(requestValidation.request, params);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    let recoveryRequestIdExists = await this.models.NodeRecoveryRequests.get({
      recoveryRequestId: params.recoveryRequestId,
      limit: 1
    }).then(data => {
      let result = false;
      if (data && data.rowLength > 0) {
        let nowTs = Date.now();
        let createdTs = new Date(data.rows[0].createdTimestamp).getTime();

        if (nowTs - createdTs <= this.appConfig.RECOVERY_HASH_EXPIRE * 1000) {
          result = true;
        }
      }

      return result;
    });

    if (!recoveryRequestIdExists) {
      responseObject.success = false;
      responseObject.errors.push('Recovery request ID is invalid/expired or does not exist');

      return responseObject;
    }

    let nodeRecoveryHash = await this.models.NodeRecoveryRequests.get({
      recoveryRequestId: params.recoveryRequestId,
      recoveryHash: params.nodeRecoveryHash
    }).then(data => {
      let result = null;
      if (data && data.rowLength > 0) {
        let nowTs = Date.now();
        let createdTs = new Date(data.rows[0].createdTimestamp).getTime();

        if (nowTs - createdTs <= this.appConfig.RECOVERY_HASH_EXPIRE * 1000) {
          result = data.rows[0];
        }
      }

      return result;
    });

    if (nodeRecoveryHash === null) {
      responseObject.success = false;
      responseObject.errors.push('Node recovery hash is invalid/expired or does not exist');

      return responseObject;
    }

    let newSecretKey = this.sha1(nodeRecoveryHash.nodeName + spark.id + Date.now());
    await this.models.Nodes.update({
      nodeShard: nodeRecoveryHash.nodeName.charAt(0).toLowerCase(),
      nodeName: nodeRecoveryHash.nodeName
    }, {
      secretKey: this.sha1(newSecretKey)
    });

    this.log.debug(`[${spark.id}] - DB update '${nodeRecoveryHash.nodeName}' => 'newSecretKey'`);

    let resultData = {
      accountEmail: nodeRecoveryHash.accountEmail,
      nodeName: nodeRecoveryHash.nodeName,
      secretKey: newSecretKey
    };

    responseObject.data.push(resultData);
    responseObject.dataLength = responseObject.data.length;

    return responseObject;
  }

  async getLatency(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          timestamp: {type: 'number'}
        },
        required: ['timestamp']
      }
    };

    let validParams = this.validator.validate(requestValidation.request, params);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    let session = this.session.getAll(spark.id);
    if (session.lastPingTimestamp === params.timestamp) {
      let latency = Math.ceil((Date.now() - session.lastPingTimestamp) / 2);

      this.session.setVar(spark.id, 'latency', latency);
      this.sendLatencyToDeepstream(spark);

      responseObject.data.push({latency: latency});
      responseObject.dataLength = responseObject.data.length;
    } else {
      responseObject.success = false;
      responseObject.errors.push('Wrong timestamp');
    }

    return responseObject;
  }

  sendLatencyToDeepstream(spark) {
    let session = this.session.getAll(spark.id);
    if (session.isLoggedIn === true) {
      this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${session.nodeName}/nodeData`, 'nodeData.wsLatency', session.latency);
    }
  }

  saveLastActivityTimestamp(spark) {
    let session = this.session.getAll(spark.id);

    if (session.isLoggedIn === true) {
      let nodeName = session.nodeName;
      let totalOnlineTime = session.totalOnlineTime;
      let firstLoginTimestamp = parseInt(session.firstLoginTimestamp, 10);
      let lastActivityTimestamp = session.lastActivityTimestamp;
      let lastSavedLastActivityTimestamp = session.lastSavedLastActivityTimestamp;
      let currentTimestamp = Date.now();

      // save last activity in the DB once every min 1 minute
      if (currentTimestamp - lastSavedLastActivityTimestamp >= 60000) {
        totalOnlineTime = totalOnlineTime.plus(lastActivityTimestamp - lastSavedLastActivityTimestamp);
        this.session.setVar(spark.id, 'totalOnlineTime', totalOnlineTime);

        let onlineTimePercent = totalOnlineTime.dividedBy(currentTimestamp - firstLoginTimestamp).multipliedBy(100).toFixed(2);
        onlineTimePercent = Math.max(0, Math.min(100, onlineTimePercent));
        this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${session.nodeName}/nodeData`, 'nodeData.onlineTimePercent', onlineTimePercent);

        this.session.setVar(spark.id, 'lastSavedLastActivityTimestamp', currentTimestamp);
        this.models.Nodes.update({
          nodeShard: nodeName.charAt(0).toLowerCase(),
          nodeName: nodeName
        }, {
          lastActivityTimestamp: new Date(lastActivityTimestamp).toISOString(),
          totalOnlineTime: totalOnlineTime.toString(10)
        });
      }
    }
  }
}
