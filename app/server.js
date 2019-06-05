import fs from 'fs';
import http from 'http';
import Primus from 'primus';
import primusResponder from 'primus-responder';
import deepstream from 'deepstream.io-client-js';
import kafka from 'kafka-node';
import sha1 from 'sha1';
import compareVersions from 'compare-versions';
import RateLimiter from '@druide/rate-limiter';
import Ajv from 'ajv';

import Session from './lib/Session.js';
import AjvError from './lib/AjvError.js';
import DsDataLoader from './lib/DsDataLoader.js';
import Statistics from './lib/Statistics.js';

import controllers from './controllers/server/index.js';

export default class Server {
  constructor(diContainer) {
    this.resetDsData = true;
    this.appConfig = diContainer.appConfig;
    this.log = diContainer.logger;
    this.lodash = diContainer.lodash;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.primusHttpServer = http.createServer();
    this.models = diContainer.models;
    this.kafkaUtils = diContainer.kafkaUtils;

    this.host = this.appConfig.APP_HOST;
    this.port = this.appConfig.APP_PORT;
    this.pingInterval = this.appConfig.SERVER_PING_INTERVAL;
    this.wsTimeout = this.appConfig.SERVER_WS_TIMEOUT;

    this.clients = {};
    this.session = new Session(diContainer);
    diContainer.session = this.session;

    this.validator = new Ajv({allErrors: true, jsonPointers: true, useDefaults: true});
    this.validatorError = new AjvError(diContainer);

    diContainer.validator = this.validator;
    diContainer.validatorError = this.validatorError;

    diContainer.sha1 = sha1;
    diContainer.compareVersions = compareVersions;

    this.deepstreamConfig = {
      host: this.appConfig.DEEPSTREAM_HOST,
      port: this.appConfig.DEEPSTREAM_PORT,
      username: this.appConfig.DEEPSTREAM_SERVER_USER,
      password: this.appConfig.DEEPSTREAM_SERVER_PASSWORD
    };
    this.deepstream = deepstream(`${this.deepstreamConfig.host}:${this.deepstreamConfig.port}`);
    this.deepstream.login({username: this.deepstreamConfig.username, password: this.deepstreamConfig.password});

    diContainer.deepstream = this.deepstream;

    this.dsDataLoader = new DsDataLoader(diContainer);
    this.dsDataLoader.initCleanUp();
    diContainer.dsDataLoader = this.dsDataLoader;

    this.statistics = new Statistics(diContainer);
    diContainer.statistics = this.statistics;

    this.deepstream.on('connectionStateChanged', state => {
      if (state === 'OPEN') {
        this.log.info(`Deepstream => Connected to: ${this.deepstreamConfig.host}:${this.deepstreamConfig.port}`);
        setTimeout(() => {
          this.log.info('Deepstream => Restoring data');
          this.initDeepstreamData();
        }, 500);
      }
    });
    this.deepstream.on('error', error => {
      this.log.error('Deepstream => ' + error);
    });

    this.wsRequestRateLimit = this.appConfig.WS_REQUEST_RATE_LIMIT;
    this.wsRequestRateInterval = this.appConfig.WS_REQUEST_RATE_INTERVAL;

    if (this.appConfig.DB_TYPE === 'postgres') {
      return this.checkIfPostgresTablesExists().then(() => {
        this.init(diContainer);
        return this.primusServer;
      });
    }

    this.init(diContainer);
    return this.primusServer;
  }

  init(diContainer) {
    if (this.appConfig.LITE === false) {
      this.kafkaHost = this.appConfig.KAFKA_HOST;
      this.kafkaClientOptions = {
        kafkaHost: this.kafkaHost
      };
      this.kafkaProducerOptions = {
        partitionerType: 2
      };
      this.kafkaProducer = new kafka.Producer(new kafka.KafkaClient(this.kafkaClientOptions), this.kafkaProducerOptions);

      this.kafkaProducer.on('error', error => {
        this.log.error(`Kafka => ${error.message}`);
        this.kafkaUtils.checkErrorRate(error);
        if (error.message.search('ECONNREFUSED') !== -1) {
          process.exit(1);
        }
      });

      this.kafkaProducer.on('ready', () => {
        this.log.info(`Kafka => Connected to: ${this.kafkaHost}`);
        diContainer.kafkaProducer = this.kafkaProducer;
        this.controllers = controllers(diContainer);
        this.initPrimus();
      });
    } else {
      this.controllers = controllers(diContainer);
      this.initPrimus();
    }
  }

  initPrimus() {
    this.primusServer = new Primus(this.primusHttpServer, {
      transformer: 'websockets',
      pathname: '/api',
      parser: 'JSON',
      pingInterval: false, // native primus ping-pong disabled, custom ping pong implemented due to custom protocol
      maxLength: 31457280,
      plugin: {
        responder: primusResponder
      }
    });

    this.primusServer.on('initialised', () => {
      this.log.info('Primus server initialised');

      setInterval(() => {
        Object.keys(this.clients).forEach(sparkId => {
          let lastPingTimestamp = Date.now();
          let lastActivityTimestamp = this.session.getVar(sparkId, 'lastActivityTimestamp');

          if (lastPingTimestamp - lastActivityTimestamp >= (this.wsTimeout * 1000)) {
            let notificationMessage = `No data received for more than ${this.wsTimeout} seconds, ending connection`;

            this.log.info(`[${sparkId}] - ${notificationMessage}`);

            let responseObject = this.lodash.cloneDeep(this.controllers.AbstractController.responseObject);
            responseObject.success = false;
            responseObject.errors.push(notificationMessage);
            this.controllers.AbstractController.clientWrite(this.clients[sparkId], 'clientTimeout', responseObject);
            this.controllers.AbstractController.clientClose(this.clients[sparkId]);
          }

          if (this.clients[sparkId] !== undefined && this.session.getVar(sparkId, 'isV1Client') === false) {
            this.session.setVar(sparkId, 'lastPingTimestamp', lastPingTimestamp);
            this.controllers.AbstractController.clientWrite(this.clients[sparkId], 'ping', {timestamp: lastPingTimestamp});
          }
        });
      }, this.pingInterval * 1000);
    });

    this.primusServer.on('connection', spark => {
      this.log.info(`[${spark.id}] - New connection from ${spark.address.ip}`);
      this.prometheusMetrics.ethstats_server_ws_connections_count.inc();

      this.clients[spark.id] = spark;

      this.session.setVar(spark.id, 'isLoggedIn', false);
      this.session.setVar(spark.id, 'latency', 0);
      this.session.setVar(spark.id, 'rateLimiter', new RateLimiter(this.wsRequestRateLimit, this.wsRequestRateInterval));
      this.session.setVar(spark.id, 'lastActivityTimestamp', Date.now());
      this.session.setVar(spark.id, 'lastSavedLastActivityTimestamp', Date.now());

      spark.on('error', error => {
        this.log.error(`Primus => ${error.name}: ${error.message}`);

        if (error.name === 'ParserError') {
          let responseObject = this.lodash.cloneDeep(this.controllers.AbstractController.responseObject);
          responseObject.success = false;
          responseObject.errors = [`${error.name}: ${error.message}`];
          this.controllers.AbstractController.clientWrite(spark, 'invalidMessage', responseObject);
        }
      });

      spark.on('data', message => {
        message = this.checkBackwardsCompatibility(spark, message);
        this.handleMessage(spark, 'data', message, {});
      });

      spark.on('request', (message, done) => {
        this.handleMessage(spark, 'request', message, done);
      });

      spark.on('end', () => {
        this.log.info(`[${spark.id}] - Connection ended`);
        this.prometheusMetrics.ethstats_server_ws_connections_count.dec();

        this.controllers.AuthController.logout(spark).then(() => {
          this.session.delete(spark.id);
        });

        delete this.clients[spark.id];
      });
    });

    this.primusHttpServer.listen(this.port, () => {
      this.log.echo(`Primus HTTP Server is running on ${this.host}:${this.port}`);
    });

    this.primusHttpServer.on('error', error => {
      this.log.error(`Primus HTTP Server => ${error}`);
    });
  }

  handleMessage(spark, type, message, done) {
    this.log.info(`[${spark.id}] - Message type '${type}' received on topic: '${message.topic}' => payload: ${JSON.stringify(message.payload)}`);
    this.prometheusMetrics.ethstats_server_ws_messages_topic_total.inc({topic: message.topic}, 1, Date.now());

    this.session.setVar(spark.id, 'lastActivityTimestamp', Date.now());
    this.controllers.NodesController.saveLastActivityTimestamp(spark);

    let messageValidationResult = this.validateMessage(type, message);

    if (messageValidationResult.success === false) {
      this.controllers.AbstractController.clientWrite(spark, 'invalidMessage', messageValidationResult);
    } else if (this.session.getVar(spark.id, 'rateLimiter').accept(1)) {
      if (this.session.getVar(spark.id, 'rateLimitLastOccurence')) {
        this.session.setVar(spark.id, 'rateLimitLastOccurence', null);
      }

      if (type === 'request') {
        this.handleCustomRequestTransport(spark, message, done);
      } else {
        this.handleDataTransport(spark, message);
      }
    } else if (!this.session.getVar(spark.id, 'rateLimitLastOccurence')) {
      this.session.setVar(spark.id, 'rateLimitLastOccurence', Date.now());

      let responseObject = this.lodash.cloneDeep(this.controllers.AbstractController.responseObject);
      responseObject.warnings.push('WebSocket request rate limit reached');
      this.controllers.AbstractController.clientWrite(spark, 'requestRateLimitReached', responseObject);
    }
  }

  validateMessage(type, message) {
    let result = this.lodash.cloneDeep(this.controllers.AbstractController.responseObject);
    let dataTopics = [
      'registerNode',
      'sendRecoveryEmail',
      'recoverNode',
      'login',
      'logout',
      'connection',
      'block',
      'sync',
      'stats',
      'usage',
      'pong',
      'checkChainData',
      'getBlocksData',
      'validators',
      'getConfig'
    ];
    let deprecatedTopics = ['node-ping', 'latency', 'pending'];
    let requestTopics = [
      'checkIfNodeExists',
      'checkIfEmailExists',
      'sendRecoveryEmail',
      'checkIfNodeRecoveryHashExists'
    ];

    let validMessage = this.validator.validate({
      type: 'object',
      additionalProperties: false,
      properties: {
        topic: {enum: (type === 'request' ? requestTopics : dataTopics.concat(deprecatedTopics))},
        payload: {type: ['object', 'array']}
      },
      required: ['topic', 'payload']
    }, message);

    if (!validMessage) {
      result.success = false;
      result.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);
    }

    return result;
  }

  handleDataTransport(spark, message) {
    switch (message.topic) {
      case 'registerNode':
        this.controllers.NodesController.add(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'registerNodeResponse', result);
        });
        break;
      case 'sendRecoveryEmail':
        this.controllers.NodesController.sendRecoveryEmail(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'sendRecoveryEmailResponse', result);
        });
        break;
      case 'recoverNode':
        this.controllers.NodesController.recoverNode(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'registerNodeResponse', result);
        });
        break;
      case 'login':
        this.controllers.AuthController.login(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'loginResponse', result);

          if (!result.success) {
            this.controllers.AbstractController.clientClose(spark);
          }
        });
        break;
      case 'logout':
        this.controllers.AuthController.logout(spark).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'logoutResponse', result);
        });
        break;
      case 'connection':
        this.controllers.ConnectionController.addLog(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'connectionResponse', result);
        });
        break;
      case 'block':
        this.controllers.BlocksController.add(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'blockResponse', result);
        });
        break;
      case 'stats':
        this.controllers.StatsController.add(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'statsResponse', result);
        });
        break;
      case 'usage':
        this.controllers.UsageController.add(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'usageResponse', result);
        });
        break;
      case 'sync':
        this.controllers.SyncsController.add(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'syncResponse', result);
        });
        break;
      case 'pong':
        this.controllers.NodesController.getLatency(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'pongResponse', result);
        });
        break;
      case 'checkChainData':
        this.controllers.BlocksController.checkChain(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'checkChainResponse', result);

          if (!result.success) {
            this.controllers.AbstractController.logout(spark).then(() => {
              this.controllers.AbstractController.clientClose(spark);
            });
          }
        });
        break;
      case 'getBlocksData':
        this.controllers.BlocksController.addHistory(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'getBlocksResponse', result);
        });
        break;
      case 'validators':
        this.controllers.BlocksController.addValidators(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'validatorsResponse', result);
        });
        break;
      case 'getConfig':
        this.controllers.AbstractController.getConfig(spark, message.payload).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'getConfigResponse', result);
        });
        break;

      // backwards compatibility with v1 clients
      case 'node-ping': {
        let clientTime = (message.payload && message.payload.clientTime) ? message.payload.clientTime : null;
        this.controllers.AbstractController.clientWrite(spark, 'node-pong', {clientTime, serverTime: Date.now()});
        break;
      }

      case 'latency':
        this.session.setVar(spark.id, 'latency', message.payload.latency);
        this.controllers.NodesController.sendLatencyToDeepstream(spark);
        break;

      case 'pending':
        this.log.debug(`[${spark.id}] - Received 'pending' => ignoring (deprecated) !!!`);
        break;

      default:
        this.log.warning(`[${spark.id}] - Message received on undefined topic: ${JSON.stringify(message)}`);
        break;
    }
  }

  handleCustomRequestTransport(spark, message, done) {
    switch (message.topic) {
      case 'checkIfNodeExists':
        this.controllers.NodesController.checkIfNodeExists(spark, message.payload).then(result => {
          done(result);
        });
        break;
      case 'checkIfEmailExists':
        this.controllers.NodesController.checkIfEmailExists(spark, message.payload).then(result => {
          done(result);
        });
        break;
      case 'sendRecoveryEmail':
        this.controllers.NodesController.sendRecoveryEmail(spark, message.payload).then(result => {
          done(result);
        });
        break;
      case 'checkIfNodeRecoveryHashExists':
        this.controllers.NodesController.checkIfNodeRecoveryHashExists(spark, message.payload).then(result => {
          done(result);
        });
        break;
      default:
        this.log.warning(`[${spark.id}] - Message received on undefined topic: ${JSON.stringify(message)}`);
        break;
    }
  }

  initDeepstreamData() {
    this.dsDataLoader.initNodeCount({resetDsData: this.resetDsData});
    this.dsDataLoader.initLastBlock();
    this.dsDataLoader.initNodes({resetDsData: this.resetDsData});

    this.resetDsData = false;

    this.models.Blocks.getLastBlockNumber().then(lastBlockNumber => {
      if (lastBlockNumber !== null) {
        this.statistics.sendToDeepstream(lastBlockNumber.number, lastBlockNumber.date);
      }
    });

    this.dsDataLoader.initPingPongRpc();
  }

  checkBackwardsCompatibility(spark, data) {
    if (data.emit === undefined) {
      return data;
    }

    let topic = data.emit.shift();
    let payload = data.emit.shift();
    let message = {
      topic: null,
      payload: null
    };

    switch (topic) {
      case 'hello':
        message.topic = 'login';
        message.payload = {
          nodeName: payload.id,
          secretKey: payload.secret,
          coinbase: payload.info.coinbase,
          node: payload.info.node,
          net: payload.info.net,
          protocol: payload.info.protocol,
          api: payload.info.api,
          os: payload.info.os,
          osVersion: payload.info.os_v,
          client: payload.info.client
        };
        break;
      case 'node-ping':
        message.topic = topic;
        message.payload = payload;
        break;
      case 'latency':
        message.topic = topic;
        message.payload = payload;
        break;
      case 'pending': {
        message.topic = topic;
        message.payload = payload;

        if (spark && spark.id && payload && payload.stats && payload.stats.pending !== undefined) {
          this.session.setVar(spark.id, 'pendingTXs', payload.stats.pending);
        }

        break;
      }

      case 'stats':
        message.topic = topic;
        message.payload = {
          mining: payload[topic].mining,
          peers: payload[topic].peers,
          hashrate: payload[topic].hashrate,
          gasPrice: payload[topic].gasPrice,
          pendingTXs: this.session.getVar(spark.id, 'pendingTXs') || 0
        };
        break;
      case 'block':
        message.topic = topic;
        message.payload = {
          author: payload[topic].author,
          difficulty: payload[topic].difficulty,
          extraData: payload[topic].extraData,
          gasLimit: payload[topic].gasLimit,
          gasUsed: payload[topic].gasUsed,
          hash: payload[topic].hash,
          logsBloom: payload[topic].logsBloom,
          miner: payload[topic].miner,
          mixHash: payload[topic].mixHash,
          nonce: payload[topic].nonce,
          number: payload[topic].number,
          parentHash: payload[topic].parentHash,
          receiptsRoot: payload[topic].receiptsRoot,
          sealFields: payload[topic].sealFields,
          sha3Uncles: payload[topic].sha3Uncles,
          size: payload[topic].size,
          stateRoot: payload[topic].stateRoot,
          timestamp: payload[topic].timestamp,
          totalDifficulty: payload[topic].totalDifficulty,
          transactionsRoot: payload[topic].transactionsRoot,
          transactions: payload[topic].transactions,
          uncles: payload[topic].uncles
        };
        break;
      case 'history':
        message.topic = 'getBlocksData';
        message.payload = payload[topic].reverse();
        break;
      default:
        this.log.warning(`[${spark.id}] - Undefined v.1 topic: ${topic}`);
        break;
    }

    return message;
  }

  checkIfPostgresTablesExists() {
    return this.models.Tools.checkIfTablesExists().then(exists => {
      let result = null;
      if (!exists) {
        this.log.info('Postgres DB tables not found, trying to install...');

        try {
          let installScript = fs.readFileSync(`${__dirname}/../db/postgres/install.sql`, 'utf8');
          result = this.models.AbstractModel.executeQuery(installScript, []);
          this.log.info('Postgres DB tables installed successfully');
        } catch (error) {
          this.log.error('Postgres install script not found');
          process.exit(1);
        }
      }

      return result;
    });
  }
}
