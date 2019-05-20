import AbstractController from './AbstractController.js';
import NodeRegisterView from '../../views/mail/NodeRegisterView.js';

export default class NodesController extends AbstractController {
  async add(request, response) {
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
      accountEmail: request.body.accountEmail,
      nodeName: request.body.nodeName
    };

    let validParams = this.validator.validate(requestValidation.request, request.body);
    if (!validParams) {
      responseObject.statusCode = 400;
      responseObject.body.success = false;
      responseObject.body.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return response.status(responseObject.statusCode).json(responseObject);
    }

    let nodeExists = await this.models.Nodes.getByNodeName(request.body.nodeName).then(data => {
      let result = false;
      if (data && data.rowLength > 0) {
        result = true;
      }

      return result;
    });

    if (nodeExists) {
      responseObject.statusCode = 400;
      responseObject.body.data.push(resultData);
      responseObject.body.success = false;
      responseObject.body.errors.push('Node already registered');
    } else {
      let secretKey = this.sha1(request.body.nodeName + Date.now());
      let nodeParams = {
        accountEmail: request.body.accountEmail.trim(),
        nodeName: request.body.nodeName.trim(),
        secretKey: this.sha1(secretKey),
        lastIp: (request.headers['x-forwarded-for'] || request.connection.remoteAddress)
      };

      this.log.debug(`[API] - DB insert node => ${JSON.stringify(nodeParams)}`);
      this.models.Nodes.add(nodeParams);

      let mailTemplate = new NodeRegisterView({
        networkName: this.appConfig.NETWORK_NAME,
        nodeName: nodeParams.nodeName,
        secretKey: secretKey,
        showGethHelp: true
      });

      let mailParams = {
        from: mailTemplate.from,
        to: nodeParams.accountEmail,
        subject: mailTemplate.subject,
        'h:Reply-To': mailTemplate['h:Reply-To'],
        html: mailTemplate.html
      };

      this.log.debug(`Send node register mail to '${nodeParams.accountEmail}', nodeName => '${nodeParams.nodeName}'`);
      this.mailer.sendMail(mailParams);

      resultData.secretKey = secretKey;
      responseObject.body.data.push(resultData);
    }

    responseObject.body.dataLength = responseObject.body.data.length;

    return response.status(responseObject.statusCode).json(responseObject);
  }

  getEvents(request, response) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let nodeName = request.params.nodeName;
    let availableEventTypes = ['auth', 'connection', 'sync', 'stats', 'block', 'usage'];
    let availableOrderBy = [this.result.formatData('eventTimestamp')];

    request.query.timestampStart = (request.query.timestampStart === undefined) ? request.query.timestampStart : parseInt(request.query.timestampStart, 10);
    request.query.timestampEnd = (request.query.timestampEnd === undefined) ? request.query.timestampEnd : parseInt(request.query.timestampEnd, 10);
    request.query.limit = (request.query.limit === undefined) ? request.query.limit : parseInt(request.query.limit, 10);
    request.query.countOnly = (request.query.countOnly === undefined) ? request.query.countOnly : parseInt(request.query.countOnly, 10);

    let requestValidation = {
      query: {
        type: 'object',
        additionalProperties: false,
        properties: {
          eventTypes: {type: 'array', items: {enum: availableEventTypes}, default: availableEventTypes},
          timestampStart: {type: 'integer'},
          timestampEnd: {type: 'integer'},
          orderBy: {type: 'array', items: {enum: availableOrderBy}, default: [availableOrderBy[0]]},
          sortType: {type: 'array', items: {enum: ['asc', 'desc']}, default: ['desc']},
          limit: {type: 'integer', default: 100},
          countOnly: {type: 'integer', enum: [0, 1], default: 0}
        }
      }
    };

    let validParams = this.validator.validate(requestValidation.query, request.query);
    if (!validParams) {
      responseObject.statusCode = 400;
      responseObject.body.success = false;
      responseObject.body.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return response.status(responseObject.statusCode).json(responseObject);
    }

    this.models.Nodes.getByNodeName(nodeName).then(data => {
      if (data && data.rowLength === 0) {
        responseObject.statusCode = 404;
        responseObject.body.success = false;
        responseObject.body.errors = ['Node not found'];

        return response.status(responseObject.statusCode).json(responseObject);
      }

      let eventsPromises = [];
      this.lodash.each(request.query.eventTypes, type => {
        eventsPromises.push(this._getEvents(nodeName, type, request.query.timestampStart, request.query.timestampEnd, request.query.limit, request.query.countOnly));
      });

      Promise.all(eventsPromises).then(results => {
        this.lodash.each(results, events => {
          if (events && events.length > 0) {
            this.lodash.each(events, event => {
              responseObject.body.data.push(event);
            });
          }
        });

        responseObject.body.data = this.result.formatData(responseObject.body.data);
        responseObject.body.data = this.lodash.orderBy(responseObject.body.data, request.query.orderBy, request.query.sortType);
        responseObject.body.data = responseObject.body.data.slice(0, request.query.limit);
        responseObject.body.dataLength = responseObject.body.data.length;

        return response.status(responseObject.statusCode).json(responseObject);
      });
    });
  }

  _getEvents(nodeName, eventType, timestampStart, timestampEnd, limit, countOnly) {
    let model = '';
    let timestampField = '';

    if (eventType === 'auth') {
      model = 'AuthLogs';
      timestampField = 'loginTimestamp';
    } else if (eventType === 'connection') {
      model = 'ConnectionLogs';
      timestampField = 'receivedTimestamp';
    } else if (eventType === 'sync') {
      model = 'Syncs';
      timestampField = 'receivedTimestamp';
    } else if (eventType === 'stats') {
      model = 'Stats';
      timestampField = 'receivedTimestamp';
    } else if (eventType === 'block') {
      model = 'BlockConfirmations';
      timestampField = 'confirmationTimestamp';
    } else if (eventType === 'usage') {
      model = 'Usage';
      timestampField = 'receivedTimestamp';
    } else {
      return false;
    }

    return this.models[model].get({
      nodeName: nodeName,
      timestampStart: timestampStart,
      timestampEnd: timestampEnd,
      order: 'desc',
      limit,
      countOnly: countOnly
    }).then(data => {
      let result = [];
      if (data && data.rowLength > 0) {
        this.lodash.each(data.rows, row => {
          if (countOnly) {
            result.push({
              eventType: eventType,
              count: parseInt(row.count, 10)
            });
          } else {
            if (model === 'BlockConfirmations') {
              row.propagationTime = parseInt(row.propagationTime, 10);
            } else if (model === 'Usage') {
              row.hostCpuLoad = parseFloat(row.hostCpuLoad);
              row.hostMemTotal = parseFloat(row.hostMemTotal);
              row.hostMemUsed = parseFloat(row.hostMemUsed);
              row.hostNetRxSec = parseFloat(row.hostNetRxSec);
              row.hostNetTxSec = parseFloat(row.hostNetTxSec);
              row.hostFsRxSec = parseFloat(row.hostFsRxSec);
              row.hostFsWxSec = parseFloat(row.hostFsWxSec);
              row.hostDiskRIOSec = parseFloat(row.hostDiskRIOSec);
              row.hostDiskWIOSec = parseFloat(row.hostDiskWIOSec);
              row.nodeCpuLoad = parseFloat(row.nodeCpuLoad);
              row.nodeMemLoad = parseFloat(row.nodeMemLoad);
              row.clientCpuLoad = parseFloat(row.clientCpuLoad);
              row.clientMemLoad = parseFloat(row.clientMemLoad);
            }

            result.push({
              eventType: eventType,
              eventTimestamp: row[timestampField],
              eventData: row
            });
          }
        });
      }

      return result;
    });
  }

  getRecoveryHashes(request, response) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let recoveryRequestId = request.params.recoveryRequestId;

    let requestValidation = {
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          recoveryRequestId: {type: 'string', pattern: '^[a-z0-9]{40}$'}
        }
      }
    };

    let validParams = this.validator.validate(requestValidation.params, request.params);
    if (!validParams) {
      responseObject.statusCode = 400;
      responseObject.body.success = false;
      responseObject.body.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return response.status(responseObject.statusCode).json(responseObject);
    }

    this.models.NodeRecoveryRequests.get({
      recoveryRequestId: recoveryRequestId
    }).then(data => {
      if (data && data.rowLength === 0) {
        responseObject.statusCode = 404;
        responseObject.body.success = false;
        responseObject.body.errors = ['Recovery request ID not found'];

        return response.status(responseObject.statusCode).json(responseObject);
      }

      let nowTs = Date.now();
      let createdTs = new Date(data.rows[0].createdTimestamp).getTime();

      if (nowTs - createdTs > this.appConfig.RECOVERY_HASH_EXPIRE * 1000) {
        responseObject.statusCode = 404;
        responseObject.body.success = false;
        responseObject.body.errors = ['Recovery request ID is expired'];

        return response.status(responseObject.statusCode).json(responseObject);
      }

      let orderByField = 'nodeName';
      let sortType = 'asc';

      responseObject.body.data = this.result.formatData(data.rows);
      responseObject.body.data = this.lodash.orderBy(responseObject.body.data, [orderByField], [sortType]);
      responseObject.body.dataLength = responseObject.body.data.length;

      return response.status(responseObject.statusCode).json(responseObject);
    });
  }
}
