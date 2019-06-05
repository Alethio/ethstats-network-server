import queue from 'async/queue';
import AbstractController from './AbstractController.js';
import consumer from '../consumer/index.js';

export default class BlocksController extends AbstractController {
  constructor(diContainer) {
    super(diContainer);

    if (this.appConfig.LITE === true) {
      this.historyFulfilled = false;
      this.consumer = consumer(diContainer);
      this.blocksQueue = queue((block, callback) => {
        setImmediate(() => {
          this.consumer.BlocksController.add(block, callback);
        });
      }, 1);
    }
  }

  async add(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      mainnet: {
        request: {
          type: 'object',
          additionalProperties: true,
          properties: {
            author: {type: 'string'},
            difficulty: {type: 'string'},
            extraData: {type: 'string'},
            gasLimit: {type: 'integer'},
            gasUsed: {type: 'integer'},
            hash: {type: 'string'},
            logsBloom: {type: 'string'},
            miner: {type: 'string'},
            mixHash: {type: 'string'},
            nonce: {type: 'string'},
            number: {type: 'integer'},
            parentHash: {type: 'string'},
            receiptsRoot: {type: 'string'},
            sealFields: {type: 'array'},
            sha3Uncles: {type: 'string'},
            size: {type: 'integer'},
            stateRoot: {type: 'string'},
            timestamp: {type: 'integer'},
            totalDifficulty: {type: 'string'},
            transactionsRoot: {type: 'string'},
            transactions: {type: 'array'},
            uncles: {type: 'array'}
          },
          required: [
            // 'author',
            'difficulty',
            // 'extraData',
            'gasLimit',
            'gasUsed',
            'hash',
            // 'logsBloom',
            'miner',
            // 'mixHash',
            // 'nonce',
            'number',
            'parentHash',
            // 'receiptsRoot',
            // 'sha3Uncles',
            // 'size',
            'stateRoot',
            'timestamp',
            'totalDifficulty',
            'transactionsRoot'
          ]
        }
      },
      quorum: {
        request: {
          type: 'object',
          additionalProperties: true,
          properties: {
            author: {type: ['string', 'null']},
            difficulty: {type: 'string'},
            extraData: {type: 'string'},
            gasLimit: {type: 'integer'},
            gasUsed: {type: 'integer'},
            hash: {type: 'string'},
            logsBloom: {type: 'string'},
            miner: {type: 'string'},
            mixHash: {type: 'string'},
            nonce: {type: 'string'},
            number: {type: 'integer'},
            parentHash: {type: 'string'},
            receiptsRoot: {type: 'string'},
            sealFields: {type: 'array'},
            sha3Uncles: {type: 'string'},
            size: {type: 'integer'},
            stateRoot: {type: 'string'},
            timestamp: {type: 'integer'},
            totalDifficulty: {type: 'string'},
            transactionsRoot: {type: 'string'},
            transactions: {type: 'array'},
            uncles: {type: 'array'}
          },
          required: [
            'difficulty',
            'extraData',
            'gasLimit',
            'gasUsed',
            'hash',
            'logsBloom',
            'miner',
            'mixHash',
            'nonce',
            'number',
            'parentHash',
            'receiptsRoot',
            'sha3Uncles',
            'size',
            'stateRoot',
            'timestamp',
            'totalDifficulty',
            'transactionsRoot'
          ]
        }
      }
    };
    requestValidation.rinkeby = requestValidation.mainnet;
    requestValidation.goerli = requestValidation.mainnet;
    requestValidation.kovan = requestValidation.mainnet;
    requestValidation.ropsten = requestValidation.mainnet;

    // Nethermind sends the transactions hashes in the block header as "transactionHashes"
    // It should be "transactions" like the rest of the nodes (Geth / Parity / Pantheon)
    if (params.transactionHashes !== undefined) {
      params.transactions = params.transactionHashes;
    }

    let validParams = this.validator.validate((requestValidation[this.appConfig.NETWORK_NAME] || requestValidation.mainnet).request, params);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    params.receivedTimestamp = Date.now();

    let session = this.session.getAll(spark.id);
    if (session.isLoggedIn === true) {
      params.nodeName = session.nodeName;

      this.cache.getVar('lastBlock').then(lastCachedBlock => {
        let lastCachedBlockObject = (lastCachedBlock === null) ? null : JSON.parse(lastCachedBlock)[0];

        if (lastCachedBlockObject === null) {
          this.models.Blocks.getLastBlockData().then(lastBlock => {
            let lastBlockNumber = (lastBlock === null) ? null : lastBlock.number;
            this.log.debug(`[${spark.id}] - Get last block from DB: ${lastBlockNumber}`);

            if (this.appConfig.LITE === true && this.appConfig.LITE_DB_PERSIST === false && this.historyFulfilled === false && lastBlockNumber === null) {
              let receivedBlockNumber = parseInt(params.number, 10);
              let historyMaxBlocks = (this.appConfig.LITE_DB_LIMIT >= this.appConfig.CHARTS_MAX_BLOCKS_HISTORY) ? this.appConfig.CHARTS_MAX_BLOCKS_HISTORY : this.appConfig.LITE_DB_LIMIT;
              let blocksToGet = this.lodash.range(Math.max(0, receivedBlockNumber - historyMaxBlocks), receivedBlockNumber, 1);

              if (blocksToGet.length) {
                this.log.debug(`[${spark.id}] - Get block history: ${this.lodash.min(blocksToGet)}..${this.lodash.max(blocksToGet)}`);
                this.clientWrite(spark, 'getBlocks', blocksToGet);
                this.historyFulfilled = true;
              }
            }

            this._sendToQueue(spark, params, lastBlock);
          });
        } else {
          this.log.debug(`[${spark.id}] - Get last block from CACHE: ${lastCachedBlockObject.number}`);
          this._sendToQueue(spark, params, lastCachedBlockObject);
        }
      });

      this.requestCheckChain(spark, {
        receivedBlockNumber: params.number,
        checkChainLastRequestedBlockNumber: session.checkChainLastRequestedBlockNumber,
        checkChainRequestCount: session.checkChainRequestCount,
        chainDetectionRate: this.appConfig.CHAIN_DETECTION_RATE_ON_BLOCK
      });
    } else {
      responseObject.success = false;
      responseObject.errors.push('Not logged in');
    }

    return responseObject;
  }

  _sendToQueue(spark, receivedBlock, lastBlock) {
    if (this.appConfig.LITE === true) {
      this.blocksQueue.push(receivedBlock);
    } else {
      let receivedBlockNumber = parseInt(receivedBlock.number, 10);
      let lastBlockNumber = (lastBlock === null) ? 0 : parseInt(lastBlock.number, 10);
      let blockDifference = receivedBlockNumber - lastBlockNumber;
      let kafkaTopic = (lastBlockNumber === 0 || blockDifference < -this.appConfig.CHARTS_MAX_BLOCKS_HISTORY) ? this.appConfig.KAFKA_TOPIC_BLOCKS_ANCIENT : this.appConfig.KAFKA_TOPIC_BLOCKS_LATEST;

      let payload = [
        {
          topic: kafkaTopic,
          key: `${receivedBlock.nodeName}.${receivedBlock.number}`,
          messages: JSON.stringify(receivedBlock)
        }
      ];

      this.kafkaProducer.send(payload, error => {
        if (error) {
          this.log.error(`[${spark.id}] - Kafka => ${error.message}`);
          this.log.debug(JSON.stringify(payload));
          this.kafkaUtils.checkErrorRate(error);
        } else {
          this.prometheusMetrics.ethstats_server_kafka_produced_messages_total.inc({topic: kafkaTopic}, 1, Date.now());
          this.log.debug(`[${spark.id}] - Received block '${receivedBlock.number}' and sent to Kafka on topic '${kafkaTopic}'`);
        }
      });
    }
  }

  async checkChain(spark, data) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let blockNumberToCheck = parseInt(data.blockNumber, 10);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          blockNumber: {type: 'integer'},
          blockHash: {type: 'string'},
          blockParentHash: {type: 'string'}
        },
        required: ['blockNumber', 'blockHash', 'blockParentHash']
      }
    };

    let validParams = this.validator.validate(requestValidation.request, data);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    this.session.incVar(spark.id, 'checkChainRequestCount', -1);
    let notOnNetworkErrorMsg = `The node is NOT on the '${this.appConfig.NETWORK_NAME}' network`;

    return this.infura.getLastBlockNumber().then(blockNumber => {
      let lastBlockNumber = parseInt(this.bigNumberUtils.getInt(blockNumber), 10);

      if (blockNumberToCheck - lastBlockNumber > this.appConfig.CHAIN_DETECTION_LAST_BLOCK_MAX_DIFF) {
        responseObject.success = false;
        responseObject.errors.push(notOnNetworkErrorMsg);

        return responseObject;
      }

      return this.infura.getBlockByNumber(blockNumberToCheck).then(infuraBlock => {
        if (infuraBlock) {
          if (infuraBlock.hash === data.blockHash && infuraBlock.parentHash === data.blockParentHash) {
            this.log.debug(`[${spark.id}] - The node is on '${this.appConfig.NETWORK_NAME}' network`);
          } else {
            responseObject.success = false;
            responseObject.errors.push(notOnNetworkErrorMsg);
          }
        } else {
          this.log.warning(`[${spark.id}] - Received block '${blockNumberToCheck}' might be higher then Infura's last block '${lastBlockNumber}', wait for next check request`);
        }

        return responseObject;
      });
    });
  }

  async addHistory(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let historyBlocksCount = params.length;
    let allPromises = [];

    for (let i = 0; i < historyBlocksCount; i++) {
      this.log.debug(`History process block: "${params[i].number}"`);
      params[i].sendToDeepstream = historyBlocksCount === i + 1;
      allPromises.push(this.add(spark, params[i]));
    }

    return Promise.all(allPromises).then(() => {
      return responseObject;
    }).catch(error => {
      this.log.error(`Error processing block history: ${error}`);
      responseObject.success = false;
      responseObject.errors.push(`Error processing block history: ${error}`);

      return responseObject;
    });
  }

  async addValidators(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          blockNumber: {type: 'integer'},
          blockHash: {type: 'string'},
          validators: {type: 'array'}
        },
        required: ['blockNumber', 'blockHash', 'validators']
      }
    };

    let validParams = this.validator.validate(requestValidation.request, params);
    if (!validParams) {
      responseObject.success = false;
      responseObject.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return responseObject;
    }

    let session = this.session.getAll(spark.id);
    if (session.isLoggedIn === true) {
      this.cache.getVar('lastBlockForValidators').then(lastBlockForValidators => {
        lastBlockForValidators = (lastBlockForValidators === null) ? null : JSON.parse(lastBlockForValidators);
        if (lastBlockForValidators && ((params.blockNumber - lastBlockForValidators.blockNumber < 0) || (lastBlockForValidators.blockNumber === params.blockNumber && lastBlockForValidators.blockHash === params.blockHash))) {
          // do nothing
        } else {
          this.log.debug(`[${spark.id}] - DB insert validators => ${JSON.stringify(params)}`);

          this.models.Validators.add(params).then(() => {
            this.dsDataLoader.sendValidatorsToDeepstream(params.validators);
          });

          this.cache.setVar('lastBlockForValidators', JSON.stringify({
            blockNumber: params.blockNumber,
            blockHash: params.blockHash
          }), this.appConfig.CACHE_LAST_BLOCK_EXPIRE);
        }
      });
    } else {
      responseObject.success = false;
      responseObject.errors.push('Not logged in');
    }

    return responseObject;
  }
}
