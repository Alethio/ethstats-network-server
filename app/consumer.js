import queue from 'async/queue';
import deepstream from 'deepstream.io-client-js';
import kafka from 'kafka-node';

import DsDataLoader from './lib/DsDataLoader.js';
import Statistics from './lib/Statistics.js';

import controllers from './controllers/consumer/index.js';

export default class Consumer {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.cli = diContainer.cli;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.kafkaUtils = diContainer.kafkaUtils;

    this.kafkaHost = diContainer.appConfig.KAFKA_HOST;
    this.kafkaTopic = this.appConfig.CONSUMER_TOPIC;
    this.kafkaConsumerGroupId = this.appConfig.CONSUMER_TOPIC;
    this.kafkaConsumerGroupOptions = {
      kafkaHost: this.kafkaHost,
      groupId: this.kafkaConsumerGroupId,
      autoCommit: true,
      encoding: 'utf8'
    };
    this.kafkaConsumerGroup = new kafka.ConsumerGroup(this.kafkaConsumerGroupOptions, this.kafkaTopic);
    this.kafkaOffset = new kafka.Offset(this.kafkaConsumerGroup.client);

    this.kafkaConsumerGroup.on('error', error => {
      this.log.error(`Kafka => ${error.message}`);
      this.kafkaUtils.checkErrorRate(error);
      if (error.message.search('ECONNREFUSED') !== -1) {
        process.exit(1);
      }
    });

    this.kafkaConsumerGroup.on('offsetOutOfRange', error => {
      let errorTopic = error.topic;
      let errorPartition = error.partition;

      this.log.warning(`Kafka => ${error.message}, topic: ${errorTopic}, partition: ${errorPartition}`);

      let offsetPayload = [
        {
          topic: errorTopic,
          partition: errorPartition,
          time: Date.now(),
          maxNum: 1
        }
      ];

      this.kafkaOffset.fetch(offsetPayload, (offsetError, data) => {
        if (offsetError === null) {
          let offset = data[errorTopic][errorPartition][0];
          this.kafkaConsumerGroup.setOffset(errorTopic, errorPartition, offset);
          this.log.warning(`Set offset to ${offset}`);
        } else {
          this.log.error(`Kafka => ${offsetError.message}`);
        }
      });
    });

    this.deepstreamConfig = {
      host: this.appConfig.DEEPSTREAM_HOST,
      port: this.appConfig.DEEPSTREAM_PORT,
      username: this.appConfig.DEEPSTREAM_CONSUMER_USER,
      password: this.appConfig.DEEPSTREAM_CONSUMER_PASSWORD
    };
    this.deepstream = deepstream(`${this.deepstreamConfig.host}:${this.deepstreamConfig.port}`);
    this.deepstream.login({username: this.deepstreamConfig.username, password: this.deepstreamConfig.password});
    this.deepstream.on('connectionStateChanged', state => {
      if (state === 'OPEN') {
        this.log.info(`Deepstream => Connected to: ${this.deepstreamConfig.host}:${this.deepstreamConfig.port}`);
      }
    });
    this.deepstream.on('error', error => {
      this.log.error('Deepstream => ' + error);
    });

    diContainer.kafkaConsumerGroup = this.kafkaConsumerGroup;
    diContainer.deepstream = this.deepstream;
    diContainer.dsDataLoader = new DsDataLoader(diContainer);
    diContainer.statistics = new Statistics(diContainer);

    this.controllers = controllers(diContainer);

    this.kafkaConsumerGroup.client.on('ready', () => {
      this.log.info(`Kafka => Connected to: ${this.kafkaHost}`);
      this.init();
    });
  }

  init() {
    const blocksQueue = queue((message, callback) => {
      setImmediate(() => {
        this.controllers.BlocksController.add(message, callback);
      });
    }, 1);

    blocksQueue.drain = () => {
      this.kafkaConsumerGroup.resume();
    };

    this.kafkaConsumerGroup.on('message', message => {
      this.prometheusMetrics.ethstats_server_kafka_consumed_messages_total.inc({topic: message.topic}, 1, Date.now());
      this.log.info(`Consuming message with offset: ${message.offset}`);

      let messageValue = JSON.parse(message.value);

      switch (message.topic) {
        case this.appConfig.KAFKA_TOPIC_BLOCKS_LATEST:
          blocksQueue.push(messageValue);
          this.kafkaConsumerGroup.pause();
          break;
        case this.appConfig.KAFKA_TOPIC_BLOCKS_ANCIENT:
          this.controllers.BlocksController.add(messageValue, () => {});
          break;
        default:
          this.log.error('Consumer: Unknown topic');
      }
    });

    return this.kafkaConsumerGroup;
  }
}
