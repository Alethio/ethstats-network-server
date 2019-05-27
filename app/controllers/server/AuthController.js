import AbstractController from './AbstractController.js';
import dictionary from '../../lib/EthonDictionary.js';

export default class AuthController extends AbstractController {
  async login(spark, params) {
    let nodeName = params.nodeName;
    let loginTimestamp = Date.now();
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: true,
        properties: {
          nodeName: {type: 'string'},
          secretKey: {type: 'string'},
          coinbase: {type: ['string', 'null']},
          node: {type: ['string', 'null']},
          net: {type: ['integer', 'string']},
          protocol: {type: ['number', 'string', 'null']},
          api: {type: ['string', 'null']},
          os: {type: 'string'},
          osVersion: {type: 'string'},
          client: {type: 'string'},
          cpu: {type: ['string', 'null']},
          memory: {type: ['string', 'null']},
          disk: {type: ['string', 'null']}
        },
        required: ['nodeName', 'secretKey', 'os', 'osVersion', 'client', 'net']
      }
    };

    let validParams = this.validator.validate(requestValidation.request, params);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    let isV1Client = false;
    if (this.compareVersions(params.client, this.appConfig.CLIENT_LAST_V1_VERSION) <= 0) {
      isV1Client = true;
    }

    if (!isV1Client && this.compareVersions(params.client, this.appConfig.CLIENT_MIN_VERSION) === -1) {
      this.log.info(`[${spark.id}] - Node '${nodeName}' is using client version '${params.client}' => ignoring login`);

      responseObject.success = false;
      responseObject.errors.push('Your version is to old. Please upgrade \'ethstats-cli\' to the latest version');

      return responseObject;
    }

    return this.models.Nodes.getByNodeName(nodeName).then(data => {
      if (!data || !data.rows || this.lodash.isEmpty(data.rows[0])) {
        responseObject.success = false;
        responseObject.errors.push('Node not found');

        return responseObject;
      }

      let node = data.rows[0];

      responseObject.data.push({
        nodeName: params.nodeName
      });

      if (!this.lodash.isEmpty(params.secretKey) && !this.lodash.isEmpty(node.secretKey) && this.sha1(params.secretKey) !== node.secretKey) {
        responseObject.success = false;
        responseObject.errors.push('Secret key is invalid');

        return responseObject;
      }

      if (this.appConfig.NETWORK_ID !== parseInt(params.net, 10)) {
        responseObject.success = false;
        responseObject.errors.push(`The node is NOT on the '${this.appConfig.NETWORK_NAME}' network`);

        return responseObject;
      }

      let lastIp = spark.address.ip;

      params.ip = lastIp;
      params.loginTimestamp = loginTimestamp;

      let promises = [
        this.addLog(spark, params),
        this.models.Nodes.update({
          nodeShard: nodeName.charAt(0).toLowerCase(),
          nodeName: nodeName
        }, {
          isActive: true,
          lastIp: lastIp,
          lastLoginTimestamp: new Date(loginTimestamp).toISOString()
        }),
        this.models.AuthLogs.get({nodeName: nodeName, order: 'asc', limit: 1})
      ];
      return Promise.all(promises).then(result => {
        let firstLogin = (result[2] && result[2].rowLength > 0) ? result[2].rows[0] : null;

        let totalOnlineTime = this.bigNumberUtils.newBigNumber(node.totalOnlineTime || 0);
        let firstLoginTimestamp = (firstLogin === null) ? loginTimestamp : new Date(firstLogin.loginTimestamp).getTime();
        let onlineTimePercent = totalOnlineTime.dividedBy(loginTimestamp - firstLoginTimestamp).multipliedBy(100).toFixed(2);
        onlineTimePercent = Math.max(0, Math.min(100, onlineTimePercent));

        this.session.setVar(spark.id, 'isLoggedIn', true);
        this.session.setVar(spark.id, 'nodeName', nodeName);
        this.session.setVar(spark.id, 'totalOnlineTime', totalOnlineTime);
        this.session.setVar(spark.id, 'firstLoginTimestamp', firstLoginTimestamp);
        this.session.setVar(spark.id, 'lastLoginTimestamp', loginTimestamp);
        this.session.setVar(spark.id, 'isV1Client', isV1Client);

        params.onlineTimePercent = onlineTimePercent;
        params.firstLoginTimestamp = firstLoginTimestamp;
        this._sendNodeToDeepstream(spark, params);

        let dsNodeCountId = `${this.appConfig.DEEPSTREAM_NAMESPACE}/stats/nodeCountData`;
        this.dsDataLoader.getRecord(dsNodeCountId).whenReady(record => {
          this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/stats/nodeCountData`, 'nodeCountData', {
            active: parseInt(record.get()[dictionary.nodeCountData].active, 10) + 1
          });
        });

        return responseObject;
      });
    });
  }

  addLog(spark, params) {
    let logParams = {
      nodeName: params.nodeName,
      coinbase: params.coinbase,
      node: params.node,
      net: params.net,
      protocol: (params.protocol === null) ? null : params.protocol.toString(),
      api: params.api,
      os: params.os,
      osVersion: params.osVersion,
      ip: params.ip,
      client: params.client,
      cpu: params.cpu,
      memory: params.memory,
      disk: params.disk,
      loginTimestamp: params.loginTimestamp
    };

    this.log.debug(`[${spark.id}] - DB insert auth log => ${JSON.stringify(logParams)}`);
    return this.models.AuthLogs.add(logParams);
  }

  _sendNodeToDeepstream(spark, params) {
    let dsNodeId = `${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${params.nodeName}`;
    let ipv4 = params.ip.split(':').pop();
    let geoIpData = this.geoIp.lookup(ipv4);
    let dataToSend = {
      nodeData: {
        isActive: true,
        nodeName: params.nodeName,
        coinbase: params.coinbase,
        node: params.node,
        net: params.net,
        protocol: params.protocol,
        api: params.api,
        os: params.os,
        osVersion: params.osVersion,
        client: params.client,
        cpu: params.cpu,
        memory: params.memory,
        disk: params.disk,
        wsLatency: 0,
        onlineTimePercent: params.onlineTimePercent,
        firstLoginTimestamp: params.firstLoginTimestamp,
        geoPoint: (geoIpData === null) ? geoIpData : geoIpData.ll.join(' ') // http://www.georss.org/georss/
      },
      nodeSyncInfo: null,
      nodeStatistics: null,
      nodeBlockData: null,
      nodeUsage: null
    };

    if (['ibft2', 'clique'].includes(this.appConfig.NETWORK_ALGO)) {
      dataToSend.nodeData.isValidator = false;
    }

    let nodesList = this.deepstream.record.getList(`${this.appConfig.DEEPSTREAM_NAMESPACE}/nodes`);
    nodesList.whenReady(list => {
      if (list.getEntries().includes(dsNodeId)) {
        this.dsDataLoader.setRecord(`${dsNodeId}/nodeData`, 'nodeData', dataToSend.nodeData);
      } else {
        list.addEntry(dsNodeId);
        this.prometheusMetrics.ethstats_server_deepstream_requests_total.inc({topic: 'nodeAdd'}, 1, Date.now());
        this.log.debug(`[${spark.id}] - Deepstream list '${this.appConfig.DEEPSTREAM_NAMESPACE}/nodes' set new record '${dsNodeId}'`);

        Object.keys(dataToSend).forEach(nodeRecord => {
          this.dsDataLoader.setRecord(`${dsNodeId}/${nodeRecord}`, nodeRecord, dataToSend[nodeRecord]);
        });
      }
    });
  }
}
