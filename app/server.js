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
    this.initDsNodesAsInactive = true;
    this.appConfig = diContainer.appConfig;
    this.log = diContainer.logger;
    this.lodash = diContainer.lodash;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.primusHttpServer = http.createServer();
    this.models = diContainer.models;
    this.kafkaUtils = diContainer.kafkaUtils;

    this.host = this.appConfig.APP_HOST;
    this.port = this.appConfig.APP_PORT;

    this.primusServer = new Primus(this.primusHttpServer, {
      transformer: 'websockets',
      pathname: '/api',
      parser: 'JSON',
      pingInterval: false, // native primus ping-pong disabled for backwards compatibility => todo: enable back after updating Geth (default: 30s)
      maxLength: 31457280,
      plugin: {
        responder: primusResponder
      }
    });
    this.primusServer.on('initialised', () => {
      this.log.info('Primus server initialised');
    });

    if (this.appConfig.LITE === false) {
      this.kafkaHost = diContainer.appConfig.KAFKA_HOST;
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

      diContainer.kafkaProducer = this.kafkaProducer;
    }

    this.session = new Session(diContainer);
    diContainer.session = this.session;

    diContainer.validator = new Ajv({allErrors: true, jsonPointers: true, useDefaults: true});
    diContainer.validatorError = new AjvError(diContainer);
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
        this.log.info('Deepstream => Restoring data');
        this.initDeepstreamData();
      }
    });
    this.deepstream.on('error', error => {
      this.log.error('Deepstream => ' + error);
    });

    this.controllers = controllers(diContainer);

    this.wsRequestRateLimit = this.appConfig.WS_REQUEST_RATE_LIMIT;
    this.wsRequestRateInterval = this.appConfig.WS_REQUEST_RATE_INTERVAL;

    return this.init();
  }

  init() {
    if (this.appConfig.LITE === false) {
      this.kafkaProducer.on('ready', () => {
        this.log.info(`Kafka => Connected to: ${this.kafkaHost}`);
        this.initPrimus();
      });
    } else {
      this.initPrimus();
    }
  }

  initPrimus() {
    this.primusHttpServer.listen(this.port, () => {
      this.log.echo(`Primus HTTP Server is running on ${this.host}:${this.port}`);
    });

    this.primusHttpServer.on('error', error => {
      this.log.error(`Primus HTTP Server => ${error}`);
    });

    this.primusServer.on('connection', spark => {
      this.log.info(`[${spark.id}] - New connection from ${spark.address.ip}`);
      this.prometheusMetrics.ethstats_server_ws_connections_count.inc();

      this.session.setVar(spark.id, 'isLoggedIn', false);
      this.session.setVar(spark.id, 'latency', 0);
      this.session.setVar(spark.id, 'rateLimiter', new RateLimiter(this.wsRequestRateLimit, this.wsRequestRateInterval));

      spark.on('error', error => {
        this.log.error(`Primus => ${error}`);
      });

      spark.on('data', data => {
        if (this.session.getVar(spark.id, 'rateLimiter').accept(1)) {
          if (this.session.getVar(spark.id, 'rateLimitLastOccurence')) {
            this.session.setVar(spark.id, 'rateLimitLastOccurence', null);
          }
          this.handleDataTransport(spark, this.checkBackwardsCompatibility(spark, data));
        } else if (!this.session.getVar(spark.id, 'rateLimitLastOccurence')) {
          this.session.setVar(spark.id, 'rateLimitLastOccurence', Date.now());

          let responseObject = this.lodash.cloneDeep(this.controllers.AbstractController.responseObject);
          responseObject.warnings.push('WS request rate limit reached');
          this.controllers.AbstractController.clientWrite(spark, 'requestRateLimitReached', responseObject);
        }
      });

      spark.on('request', (data, done) => {
        if (this.session.getVar(spark.id, 'rateLimiter').accept(1)) {
          if (this.session.getVar(spark.id, 'rateLimitLastOccurence')) {
            this.session.setVar(spark.id, 'rateLimitLastOccurence', null);
          }
          this.handleCustomRequestTransport(spark, data, done);
        } else if (!this.session.getVar(spark.id, 'rateLimitLastOccurence')) {
          this.session.setVar(spark.id, 'rateLimitLastOccurence', Date.now());

          let responseObject = this.lodash.cloneDeep(this.controllers.AbstractController.responseObject);
          responseObject.warnings.push('WS request rate limit reached');
          this.controllers.AbstractController.clientWrite(spark, 'requestRateLimitReached', responseObject);
        }
      });

      spark.on('outgoing::ping', timestamp => {
        this.session.setVar(spark.id, 'lastPingTimestamp', timestamp);
      });

      spark.on('incoming::pong', timestamp => {
        if (this.session.getVar(spark.id, 'lastPingTimestamp') === timestamp) {
          this.session.setVar(spark.id, 'lastPingTimestamp', Math.ceil((Date.now() - timestamp) / 2));
          this.controllers.AbstractController.sendLatencyToDeepstream(spark);
        }
      });

      spark.on('end', () => {
        this.log.info(`[${spark.id}] - Connection ended`);
        this.prometheusMetrics.ethstats_server_ws_connections_count.dec();

        this.controllers.AuthController.logout(spark).then(() => {
          this.session.delete(spark.id);
        });
      });
    });

    return this.primusHttpServer;
  }

  handleDataTransport(spark, data) {
    this.log.info(`[${spark.id}] - Data received on topic: ${data.topic}`);
    this.controllers.AbstractController.setLastActivityTimestamp(spark);
    this.prometheusMetrics.ethstats_server_ws_messages_topic_total.inc({topic: data.topic}, 1, Date.now());

    switch (data.topic) {
      case 'registerNode':
        this.controllers.NodesController.add(spark, data.msg).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'registerNodeResponse', result);
        });
        break;
      case 'recoverNode':
        this.controllers.NodesController.recoverNode(spark, data.msg).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'registerNodeResponse', result);
        });
        break;
      case 'login':
        this.controllers.AuthController.login(spark, data.msg).then(result => {
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
        this.controllers.ConnectionController.addLog(spark, data.msg).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'connectionResponse', result);
        });
        break;
      case 'block':
        this.controllers.BlocksController.add(spark, data.msg).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'blockResponse', result);
        });
        break;
      case 'stats':
        this.controllers.StatsController.add(spark, data.msg).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'statsResponse', result);
        });
        break;
      case 'usage':
        this.controllers.UsageController.add(spark, data.msg).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'usageResponse', result);
        });
        break;
      case 'sync':
        this.controllers.SyncsController.add(spark, data.msg).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'syncResponse', result);
        });
        break;
      case 'checkChainData':
        this.controllers.BlocksController.checkChain(spark, data.msg).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'checkChainResponse', result);

          if (!result.success) {
            this.controllers.AbstractController.logout(spark).then(() => {
              this.controllers.AbstractController.clientClose(spark);
            });
          }
        });
        break;
      case 'history':
        this.controllers.BlocksController.addHistory(spark, data.msg).then(result => {
          this.controllers.AbstractController.clientWrite(spark, 'historyResponse', result);
        });
        break;

      // backwards compatibility with v1 clients
      case 'node-ping': {
        let clientTime = (data.msg && data.msg.clientTime) ? data.msg.clientTime : null;
        this.controllers.AbstractController.clientWrite(spark, 'node-pong', {clientTime, serverTime: Date.now()});
        break;
      }
      case 'latency':
        this.session.setVar(spark.id, 'latency', data.msg.latency);
        this.controllers.AbstractController.sendLatencyToDeepstream(spark);
        break;
      case 'pending':
        this.log.debug(`[${spark.id}] - 'pending' not needed`);
        break;

      default:
        this.log.warning(`[${spark.id}] - Data received on undefined topic: ${JSON.stringify(data)}`);
        break;
    }
  }

  handleCustomRequestTransport(spark, data, done) {
    this.log.info(`[${spark.id}] - Request received on topic: ${data.topic}`);
    this.prometheusMetrics.ethstats_server_ws_messages_topic_total.inc({topic: data.topic}, 1, Date.now());

    switch (data.topic) {
      case 'checkIfNodeExists':
        this.controllers.NodesController.checkIfNodeExists(spark, data.msg).then(result => {
          done(result);
        });
        break;
      case 'checkIfEmailExists':
        this.controllers.NodesController.checkIfEmailExists(spark, data.msg).then(result => {
          done(result);
        });
        break;
      case 'sendRecoveryEmail':
        this.controllers.NodesController.sendRecoveryEmail(spark, data.msg).then(result => {
          done(result);
        });
        break;
      case 'checkIfNodeRecoveryHashExists':
        this.controllers.NodesController.checkIfNodeRecoveryHashExists(spark, data.msg).then(result => {
          done(result);
        });
        break;
      default:
        this.log.warning(`[${spark.id}] - Request received on undefined topic: ${JSON.stringify(data)}`);
        break;
    }
  }

  initDeepstreamData() {
    this.dsDataLoader.initNodeCount();
    this.dsDataLoader.initLastBlock();
    this.dsDataLoader.initNodes({initDsNodesAsInactive: this.initDsNodesAsInactive});

    this.initDsNodesAsInactive = false;

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

    let message = data.emit.shift();
    let payload = data.emit.shift();
    let result = {
      topic: null,
      msg: null
    };

    switch (message) {
      case 'hello':
        result.topic = 'login';
        result.msg = {
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
        result.topic = message;
        result.msg = payload;
        break;
      case 'latency':
        result.topic = message;
        result.msg = payload;
        break;
      case 'pending':
        result.topic = message;
        result.msg = payload;
        break;
      case 'stats':
        result.topic = message;
        result.msg = {
          mining: payload[message].mining,
          peers: payload[message].peers,
          hashrate: payload[message].hashrate,
          gasPrice: payload[message].gasPrice
        };
        break;
      case 'block':
        result.topic = message;
        result.msg = {
          author: payload[message].author,
          difficulty: payload[message].difficulty,
          extraData: payload[message].extraData,
          gasLimit: payload[message].gasLimit,
          gasUsed: payload[message].gasUsed,
          hash: payload[message].hash,
          logsBloom: payload[message].logsBloom,
          miner: payload[message].miner,
          mixHash: payload[message].mixHash,
          nonce: payload[message].nonce,
          number: payload[message].number,
          parentHash: payload[message].parentHash,
          receiptsRoot: payload[message].receiptsRoot,
          sealFields: payload[message].sealFields,
          sha3Uncles: payload[message].sha3Uncles,
          size: payload[message].size,
          stateRoot: payload[message].stateRoot,
          timestamp: payload[message].timestamp,
          totalDifficulty: payload[message].totalDifficulty,
          transactionsRoot: payload[message].transactionsRoot,
          transactions: payload[message].transactions,
          uncles: payload[message].uncles
        };
        break;
      case 'history':
        result.topic = message;
        result.msg = payload[message].reverse();
        break;
      default:
        this.log.warning(`[${spark.id}] - Undefined v.1 message: ${message}`);
        break;
    }

    return result;
  }
}
