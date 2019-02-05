import EventEmitter from 'events';
import kafka from 'kafka-node';

import EthstatsBlobApi from './lib/EthstatsBlobApi.js';

export default class Kohera {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.cache = diContainer.cache;
    this.cli = diContainer.cli;
    this.models = diContainer.models;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.bigNumberUtils = diContainer.bigNumberUtils;
    this.infura = diContainer.infura;
    this.kafkaUtils = diContainer.kafkaUtils;

    this.runContinuously = false;
    this.processRuning = false;
    this.largeIntervalRequested = false;

    this.currentInterval = {};
    this.lastInterval = {};

    this.eventEmitter = new EventEmitter();
    this.initEventHandlers();

    this.ethstatsBlobApi = new EthstatsBlobApi(diContainer);
    this.kafkaProducer = this._initKafka();

    return this;
  }

  _initKafka() {
    let kafkaClientOptions = {
      kafkaHost: this.appConfig.KAFKA_HOST
    };
    let kafkaProducerOptions = {
      partitionerType: 2
    };

    let kafkaProducer = new kafka.Producer(new kafka.KafkaClient(kafkaClientOptions), kafkaProducerOptions);

    kafkaProducer.on('ready', () => {
      this.log.info(`Kafka => Connected to: ${kafkaClientOptions.kafkaHost}`);
      this.start();
      if (this.runContinuously && !this.cli.flags.checkOnly) {
        setInterval(() => {
          this.start();
        }, this.appConfig.KOHERA_CHECK_CONSISTENCY_INTERVAL * 1000);
      }
    });
    kafkaProducer.on('error', error => {
      this.log.error(`Kafka => ${error.message}`);
      this.kafkaUtils.checkErrorRate(error);
      if (error.message.search('ECONNREFUSED') !== -1) {
        process.exit(1);
      }
    });

    return kafkaProducer;
  }

  start() {
    if (this.processRuning) {
      this.log.info('Tried to check new interval but last interval still running, trying later...');
    } else {
      this.processRuning = true;
      if (this.cli.flags.interval === undefined) {
        this.runContinuously = true;
        this.getLastInterval().then(interval => {
          this.checkInterval(interval);
        });
      } else {
        let cliInterval = this.cli.flags.interval.split(':');
        let interval = {
          start: parseInt(cliInterval[0], 10),
          end: parseInt(cliInterval[1], 10)
        };
        this.checkInterval(interval);
      }
    }
  }

  initEventHandlers() {
    this.eventEmitter.on('checkIntervalFinished', setLastInterval => {
      this.log.info('Finished processing interval');
      this.processRuning = false;

      if (this.runContinuously) {
        if (setLastInterval) {
          this.lastInterval = this.currentInterval;
          this.cache.setVar('lastIntervalCheckedByKohera', JSON.stringify(this.lastInterval), this.appConfig.CACHE_KOHERA_LAST_INTERVAL_EXPIRE);
        }

        if (this.largeIntervalRequested) {
          this.largeIntervalRequested = false;
          this.start();
        }
      } else {
        process.exit(0);
      }
    });
  }

  getLastInterval() {
    let promises = [];
    promises.push(this.infura.getLastBlockNumber());
    if (this.lodash.isEmpty(this.lastInterval)) {
      promises.push(this.cache.getVar('lastIntervalCheckedByKohera'));
    }

    return Promise.all(promises).then(results => {
      let infuraLastBlock = this.bigNumberUtils.getInt(results[0]);
      let lastInterval = this.lastInterval;

      if (this.lodash.isEmpty(this.lastInterval)) {
        lastInterval = JSON.parse(results[1]) || {};
      }

      return {
        start: parseInt(lastInterval.end, 10) || 0,
        end: parseInt(infuraLastBlock, 10) || 0
      };
    });
  }

  checkInterval(interval) {
    this.log.info(`Start processing interval ${JSON.stringify(interval)}`);

    if (!this.cli.flags.checkOnly && interval.end - interval.start > this.appConfig.KOHERA_MAX_BLOCK_INTERVAL) {
      interval.end = interval.start + this.appConfig.KOHERA_MAX_BLOCK_INTERVAL;
      this.log.warning(`The interval exceeds the max limit of ${this.appConfig.KOHERA_MAX_BLOCK_INTERVAL} blocks. Setting interval end to ${interval.end}.`);
      this.largeIntervalRequested = true;
    }

    this.currentInterval = interval;

    let blocksToCheck = [];

    if (interval.start <= interval.end) {
      for (let i = interval.start; i <= interval.end; i++) {
        blocksToCheck.push(i);
      }
    }

    let blockNumberPartitions = {};
    if (blocksToCheck.length) {
      for (let i = 0; i < blocksToCheck.length; i++) {
        let partition = Math.floor(blocksToCheck[i] / this.models.Blocks.numberPartitionDivider);
        if (blockNumberPartitions[partition] === undefined) {
          blockNumberPartitions[partition] = true;
        }
      }

      this.log.info('Start checking DB for existing blocks');

      let partitionCount = Object.keys(blockNumberPartitions).length;
      let existingBlocks = [];
      let missingBlocks = {};
      let startedRequestCount = 0;
      let finishedRequestCount = 0;

      Object.keys(blockNumberPartitions).forEach(partition => {
        startedRequestCount++;

        setTimeout(() => {
          this.models.Blocks.getByNumberPartition(partition).then(data => {
            this.log.info(`Received blocks for block number partition: ${partition}`);
            finishedRequestCount++;

            if (data && data.rowLength > 0) {
              data.rows.forEach(row => {
                existingBlocks.push(row.number);
              });
            }

            if (finishedRequestCount === partitionCount) {
              this.lodash.difference(blocksToCheck, existingBlocks).forEach(block => {
                missingBlocks[block] = null;
              });

              let missingBlockCount = Object.keys(missingBlocks).length;
              if (missingBlockCount > 0) {
                this.log.info(`Found ${missingBlockCount} missing blocks`);
                if (this.cli.flags.checkOnly) {
                  process.exit(0);
                } else {
                  this.getBlocksData(missingBlocks);
                }
              } else {
                this.log.info('No missing blocks found');
                if (this.cli.flags.checkOnly) {
                  process.exit(0);
                } else {
                  this.eventEmitter.emit('checkIntervalFinished', true);
                }
              }
            }
          });
        }, startedRequestCount * this.appConfig.KOHERA_DB_REQUEST_TIMEOUT);
      });
    } else {
      this.log.info('There is nothing to check in this interval');
      this.eventEmitter.emit('checkIntervalFinished', false);
    }
  }

  getBlocksData(blocks) {
    this.log.info('Start getting blocks data');

    let blockCount = Object.keys(blocks).length;
    let startedRequestCount = 0;
    let finishedRequestCount = 0;

    Object.keys(blocks).forEach(blockNumber => {
      startedRequestCount++;

      setTimeout(() => {
        this.log.info(`Requesting data for block ${blockNumber}`);

        this.ethstatsBlobApi.getBlockByNumber(blockNumber).then(blockData => {
          finishedRequestCount++;

          if (this.lodash.isEmpty(blockData)) {
            this.log.error(`Could not get data for block ${blockNumber}`);
          } else {
            this.log.info(`Received data for block ${blockNumber}`);

            blockData.nodeName = 'Kohera';
            blockData.receivedTimestamp = Date.now();
            blockData.number = this.bigNumberUtils.getInt(blockData.number);
            blockData.gasLimit = this.bigNumberUtils.getInt(blockData.gasLimit);
            blockData.gasUsed = this.bigNumberUtils.getInt(blockData.gasUsed);
            blockData.size = this.bigNumberUtils.getInt(blockData.size);
            blockData.timestamp = this.bigNumberUtils.getInt(blockData.timestamp);
            blockData.difficulty = this.bigNumberUtils.getInt(blockData.difficulty);
            blockData.totalDifficulty = this.bigNumberUtils.getInt(blockData.totalDifficulty);

            let transactions = [];
            blockData.transactions.forEach(tx => {
              transactions.push(tx.hash);
            });
            blockData.transactions = transactions;

            blocks[blockNumber] = blockData;
          }

          if (finishedRequestCount === blockCount) {
            this.log.info('Finished getting data');

            let blocksWithoutData = [];
            Object.keys(blocks).forEach(blockNumber => {
              if (blocks[blockNumber] === null) {
                blocksWithoutData.push(blockNumber);
                delete blocks[blockNumber];
              }
            });

            if (blocksWithoutData.length) {
              this.currentInterval.end = this.lodash.min(blocksWithoutData);
            }

            if (Object.keys(blocks).length) {
              this.resolveBlockTime(blocks);
            } else {
              this.log.info('Seems that could not get data for all the blocks in the interval');
              this.eventEmitter.emit('checkIntervalFinished', false);
            }
          }
        });
      }, startedRequestCount * this.appConfig.KOHERA_API_REQUEST_TIMEOUT);
    });
  }

  resolveBlockTime(blocks) {
    this.log.info('Start resolving blockTime');

    let blockCount = Object.keys(blocks).length;
    let finishedResolveCount = 0;

    Object.keys(blocks).forEach(blockNumber => {
      blockNumber = parseInt(blockNumber, 10);

      if (blocks[blockNumber - 1]) {
        blocks[blockNumber].blockTime = (parseInt(blocks[blockNumber - 1].timestamp, 10) === 0) ? 0 : blocks[blockNumber].timestamp - blocks[blockNumber - 1].timestamp;
      }

      finishedResolveCount++;

      if (finishedResolveCount === blockCount) {
        this.log.info('Finished resolving blockTime');
        this.sendBlocksToQueue(blocks);
      }
    });
  }

  sendBlocksToQueue(blocks) {
    this.log.info('Start sending to queue');

    let blockCount = Object.keys(blocks).length;
    let startedRequestCount = 0;
    let finishedRequestCount = 0;

    Object.keys(blocks).forEach(blockNumber => {
      startedRequestCount++;

      setTimeout(() => {
        this.sendBlockToKafka(blocks[blockNumber], () => {
          finishedRequestCount++;

          if (finishedRequestCount === blockCount) {
            this.log.info('Finished sending to queue');
            this.eventEmitter.emit('checkIntervalFinished', true);
          }
        });
      }, startedRequestCount * this.appConfig.KOHERA_QUEUE_REQUEST_TIMEOUT);
    });
  }

  sendBlockToKafka(block, callback) {
    let payload = [
      {
        topic: this.appConfig.KAFKA_TOPIC_BLOCKS_ANCIENT,
        key: `${block.nodeName}.${block.number}`,
        messages: JSON.stringify(block)
      }
    ];

    this.kafkaProducer.send(payload, error => {
      if (error) {
        this.log.error(`Kafka => ${error.message}`);
        this.log.debug(JSON.stringify(payload));
        this.kafkaUtils.checkErrorRate(error);
      } else {
        this.prometheusMetrics.ethstats_kohera_kafka_produced_messages_total.inc({topic: this.appConfig.KAFKA_TOPIC_BLOCKS_ANCIENT}, 1, Date.now());
        this.log.debug(`Block '${block.number}' sent to Kafka on topic '${this.appConfig.KAFKA_TOPIC_BLOCKS_ANCIENT}'`);
      }

      callback();
    });
  }
}
