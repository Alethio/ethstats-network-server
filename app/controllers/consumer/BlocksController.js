import AbstractController from './AbstractController.js';
import BlockUtils from '../../lib/BlockUtils.js';

export default class BlocksController extends AbstractController {
  add(params, callback) {
    let nodeName = params.nodeName;
    this.log.info(`Processing block '${params.number}' from node '${nodeName}'`);

    this.checkIfBlockExists(params).then(existingBlock => {
      params.confirmationTimestamp = params.receivedTimestamp;

      if (existingBlock === false) {
        this.cache.getVar('lastBlock').then(lastCachedBlock => {
          let lastCachedBlockObject = (lastCachedBlock === null) ? null : JSON.parse(lastCachedBlock)[0];
          this.log.debug(`Get last block from CACHE: '${(lastCachedBlockObject) ? lastCachedBlockObject.number : lastCachedBlockObject}' => ${lastCachedBlock}`);

          if (lastCachedBlockObject === null) {
            this.models.Blocks.getLastBlockData().then(lastBlock => {
              this.log.debug(`Get last block from DB: '${(lastBlock === null) ? null : lastBlock.number}' => ${JSON.stringify(lastBlock)}`);
              return this._processBlock(params, lastBlock, callback);
            });
          } else {
            return this._processBlock(params, lastCachedBlockObject, callback);
          }
        });
      } else {
        this.log.debug(`Block already exists, confirm block: ${existingBlock.number}`);

        this.checkIfBlockConfirmationExists(nodeName, params.hash).then(exists => {
          if (!exists) {
            params.blockTime = existingBlock.blockTime;
            params.receivedTimestamp = existingBlock.receivedTimestamp;

            this._insertBlockConfirmation(nodeName, params);

            this.models.Blocks.update({
              number: existingBlock.number,
              hash: existingBlock.hash,
              timestamp: existingBlock.timestamp
            }, {
              rank: existingBlock.rank + 1
            });

            let blockParams = {
              hash: params.hash,
              number: params.number,
              parentHash: params.parentHash,
              receivedTimestamp: params.receivedTimestamp,
              blockTime: params.blockTime,
              timestamp: params.timestamp,
              rank: 0
            };

            this._setLastBlock(blockParams);
          }

          return callback();
        });
      }
    });
  }

  checkIfBlockExists(block) {
    return this.models.Blocks.getBlock({number: block.number, hash: block.hash}).then(foundBlock => {
      let result = false;
      if (foundBlock !== null) {
        if (this.bigNumberUtils.getInt(block.difficulty) === this.bigNumberUtils.getInt(foundBlock.difficulty) &&
          // block.extraData.toLowerCase() === foundBlock.extraData.toLowerCase() &&
          this.bigNumberUtils.getInt(block.gasLimit) === this.bigNumberUtils.getInt(foundBlock.gasLimit) &&
          this.bigNumberUtils.getInt(block.gasUsed) === this.bigNumberUtils.getInt(foundBlock.gasUsed) &&
          block.hash.toLowerCase() === foundBlock.hash.toLowerCase() &&
          // block.logsBloom.toLowerCase() === foundBlock.logsBloom.toLowerCase() &&
          // block.miner.toLowerCase() === foundBlock.miner.toLowerCase() &&
          // block.mixHash.toLowerCase() === foundBlock.mixHash.toLowerCase() &&
          // block.nonce.toLowerCase() === foundBlock.nonce.toLowerCase() &&
          this.bigNumberUtils.getInt(block.number) === this.bigNumberUtils.getInt(foundBlock.number) &&
          block.parentHash.toLowerCase() === foundBlock.parentHash.toLowerCase() &&
          // block.receiptsRoot.toLowerCase() === foundBlock.receiptsRoot.toLowerCase() &&
          // block.sha3Uncles.toLowerCase() === foundBlock.sha3Uncles.toLowerCase() &&
          // block.size === foundBlock.size &&
          block.stateRoot.toLowerCase() === foundBlock.stateRoot.toLowerCase() &&
          this.bigNumberUtils.getInt(block.timestamp) === this.bigNumberUtils.getInt(foundBlock.timestamp) &&
          this.bigNumberUtils.getInt(block.totalDifficulty) === this.bigNumberUtils.getInt(foundBlock.totalDifficulty) &&
          block.transactionsRoot.toLowerCase() === foundBlock.transactionsRoot.toLowerCase()) {
          result = foundBlock;
        } else {
          result = false;
        }
      }

      return result;
    });
  }

  checkIfBlockConfirmationExists(nodeName, blockHash) {
    return this.models.BlockConfirmations.get({
      nodeName: nodeName,
      blockHash: blockHash
    }).then(data => {
      let result = false;
      if (data && data.rowLength > 0) {
        result = true;
      }

      return result;
    });
  }

  _processBlock(receivedBlock, lastBlock, callback) {
    let nodeName = receivedBlock.nodeName;
    let receivedBlockNumber = parseInt(receivedBlock.number, 10);
    let lastBlockNumber = (lastBlock === null) ? 0 : parseInt(lastBlock.number, 10);
    let blockDifference = receivedBlockNumber - lastBlockNumber;

    if (blockDifference === 1) {
      this.log.debug(`Received block '${receivedBlockNumber}' is consecutive`);

      receivedBlock.blockTime = Math.max(0, parseInt(receivedBlock.timestamp, 10) - parseInt(lastBlock.timestamp, 10));
      return this._insertBlock(nodeName, receivedBlock, true, true, callback);
    }

    if (blockDifference <= 0) {
      if (blockDifference < 0) {
        this.log.debug(`Received block '${receivedBlockNumber}' is less than server last block '${lastBlockNumber}'`);
      } else {
        this.log.debug(`Received block '${receivedBlockNumber}' has same block number as the server last block '${lastBlockNumber}' but different data`);
      }

      return this.models.Blocks.getBlock({number: receivedBlockNumber - 1}).then(block => {
        if (receivedBlock.blockTime === undefined) {
          receivedBlock.blockTime = (block === null) ? 0 : Math.max(0, parseInt(receivedBlock.timestamp, 10) - parseInt(block.timestamp, 10));
        }

        let sendStatisticsToDeepstream = (receivedBlock.sendToDeepstream === undefined) ? (Math.abs(blockDifference) < this.appConfig.CHARTS_MAX_BLOCKS_HISTORY) : receivedBlock.sendToDeepstream;

        return this._insertBlock(nodeName, receivedBlock, (blockDifference === 0), sendStatisticsToDeepstream, callback);
      });
    }

    if (blockDifference > 1) {
      this.log.debug(`Received block '${receivedBlockNumber}' is greater than server last block '${lastBlockNumber}', just insert it`);

      receivedBlock.blockTime = 0;

      if (this.appConfig.CHAIN_DETECTION_ENABLED) {
        return this.infura.getLastBlockNumber().then(blockNumber => {
          let setAsLastBlock = false;
          let infuraLastBlockNumber = 0;

          if (blockNumber) {
            infuraLastBlockNumber = parseInt(this.bigNumberUtils.getInt(blockNumber), 10);

            if (receivedBlockNumber - infuraLastBlockNumber <= this.appConfig.CHAIN_DETECTION_LAST_BLOCK_MAX_DIFF) {
              setAsLastBlock = true;
            } else {
              this.log.warning(`Received block '${receivedBlockNumber}' is higher then Infura's last block '${infuraLastBlockNumber}', so not set as last block `);
            }
          } else {
            this.log.error('Cannot get last block from Infura, so received block not set as last block');
          }

          return this._insertBlock(nodeName, receivedBlock, setAsLastBlock, setAsLastBlock, callback);
        });
      }

      return this._insertBlock(nodeName, receivedBlock, true, true, callback);
    }
  }

  _insertBlock(nodeName, params, setAsLastBlock, sendStatisticsToDeepstream, callback) {
    let newBlockParams = {
      date: this.models.Blocks.getNumberPartitionKey(parseInt(params.timestamp, 10) * 1000),
      hash: params.hash,
      difficulty: params.difficulty,
      extraData: params.extraData,
      gasLimit: params.gasLimit,
      gasUsed: params.gasUsed,
      logsBloom: params.logsBloom,
      miner: params.miner,
      mixHash: params.mixHash,
      nonce: params.nonce,
      number: params.number,
      parentHash: params.parentHash,
      receiptsRoot: params.receiptsRoot,
      sealFields: JSON.stringify(params.sealFields),
      sha3Uncles: params.sha3Uncles,
      size: params.size,
      stateRoot: params.stateRoot,
      timestamp: params.timestamp,
      totalDifficulty: params.totalDifficulty,
      transactionsRoot: params.transactionsRoot,
      receivedTimestamp: params.receivedTimestamp,
      blockTime: params.blockTime,
      rank: 0,
      txCount: params.transactions.length,
      uncleCount: params.uncles.length
    };

    this.log.debug(`DB insert block => '${newBlockParams.number}' => ${JSON.stringify(newBlockParams)}`);
    return this.models.Blocks.add(newBlockParams).then(() => {
      this.checkIfBlockConfirmationExists(nodeName, params.hash).then(exists => {
        if (!exists) {
          this._insertBlockConfirmation(nodeName, params);
        }
      });

      if (setAsLastBlock) {
        this._setLastBlock(newBlockParams);
        this._sendLastBlockToDeepstream(newBlockParams);

        if (this.appConfig.NETWORK_ALGO === 'ibft2') {
          this.dsDataLoader.sendValidatorsToDeepstream(BlockUtils.getIBFT2Validators(params));
        }
      }

      if (sendStatisticsToDeepstream) {
        this.statistics.sendToDeepstream(newBlockParams.number, newBlockParams.date);
      }

      if (newBlockParams.txCount > 0) {
        this.log.debug(`DB insert '${newBlockParams.txCount}' transactions for block => ${newBlockParams.number}`);
        this.models.BlockTransactions.addBatch(params.hash, params.transactions);
      }

      if (newBlockParams.uncleCount > 0) {
        this.log.debug(`DB insert '${newBlockParams.uncleCount}' uncles for block => ${newBlockParams.number}`);
        this.models.BlockUncles.addBatch(params.hash, params.uncles);
      }

      return callback();
    });
  }

  _insertBlockConfirmation(nodeName, block) {
    block.propagationTime = (block.sendToDeepstream === undefined) ? parseInt(new Date(block.confirmationTimestamp).getTime(), 10) - parseInt(new Date(block.receivedTimestamp).getTime(), 10) : 0;

    if (block.propagationTime < 0) {
      this.log.debug(`Negative propagationTime detected for node '${nodeName}' => ${JSON.stringify(block)}`);
    }

    block.propagationTime = Math.max(0, block.propagationTime);

    let blockConfirmationParams = {
      nodeName: nodeName,
      blockNumber: block.number,
      blockHash: block.hash,
      confirmationTimestamp: block.confirmationTimestamp,
      propagationTime: block.propagationTime
    };

    this.log.debug(`DB insert confirmation for block => ${blockConfirmationParams.blockNumber}`);
    return this.models.BlockConfirmations.add(blockConfirmationParams).then(() => {
      this._sendNodeBlockToDeepstream(nodeName, block);
    });
  }

  _sendNodeBlockToDeepstream(nodeName, block) {
    let currentNodes = this.deepstream.record.getList(`${this.appConfig.DEEPSTREAM_NAMESPACE}/nodes`);
    currentNodes.whenReady(list => {
      if (list.getEntries().includes(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${nodeName}`)) {
        this.models.BlockConfirmations.get({
          nodeName: nodeName,
          order: 'desc',
          limit: this.appConfig.CHARTS_NODE_BLOCK_PROPAGATION_MAX_BINS
        }).then(data => {
          if (data && data.rowLength > 0) {
            let propagationTimes = [];
            let propagationSum = 0;

            for (let i = data.rowLength - 1; i >= 0; i--) {
              propagationSum += parseInt(data.rows[i].propagationTime, 10);
              propagationTimes.push(parseInt(data.rows[i].propagationTime, 10));
            }

            let missingBins = this.appConfig.CHARTS_NODE_BLOCK_PROPAGATION_MAX_BINS - propagationTimes.length;
            if (missingBins > 0) {
              for (let i = 0; i < missingBins; i++) {
                propagationTimes.unshift(0);
              }
            }

            let propagationAvg = propagationSum / data.rowLength;
            let dataToSend = {
              number: block.number,
              hash: block.hash,
              difficulty: block.difficulty,
              totalDifficulty: block.totalDifficulty,
              gasLimit: block.gasLimit,
              timestamp: new Date(block.timestamp * 1000),
              receivedTimestamp: new Date(block.receivedTimestamp),
              confirmationTimestamp: data.rows[0].confirmationTimestamp,
              blockTime: block.blockTime,
              txCount: block.transactions.length,
              uncleCount: block.uncles.length,
              propagationData: {
                propagationTime: parseInt(block.propagationTime, 10),
                propagationAverage: propagationAvg,
                propagationChartData: propagationTimes
              }
            };

            this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${nodeName}/nodeBlockData`, 'nodeBlockData', dataToSend);
          }
        });
      }
    });
  }

  _sendLastBlockToDeepstream(block) {
    let blockToAdd = this.lodash.clone(block);
    let dsLastBlockId = `${this.appConfig.DEEPSTREAM_NAMESPACE}/stats/lastBlockData`;

    delete blockToAdd.transactions;
    delete blockToAdd.uncles;

    blockToAdd.timestamp = new Date(block.timestamp * 1000);
    blockToAdd.receivedTimestamp = new Date(block.receivedTimestamp);

    let statsList = this.deepstream.record.getList(`${this.appConfig.DEEPSTREAM_NAMESPACE}/stats`);
    statsList.whenReady(list => {
      if (!list.getEntries().includes(dsLastBlockId)) {
        list.addEntry(dsLastBlockId);
      }
    });

    this.dsDataLoader.setRecord(dsLastBlockId, 'lastBlockData', blockToAdd);
  }

  _setLastBlock(block) {
    this.cache.getVar('lastBlock').then(data => {
      let lastBlock = (data === null) ? null : JSON.parse(data);
      let lastBlockNumber = (lastBlock && lastBlock.length > 0) ? parseInt(lastBlock[0].number, 10) : 0;
      let receivedBlockNumber = parseInt(block.number, 10);

      if (receivedBlockNumber === lastBlockNumber) {
        let hashExists = false;
        for (let i = 0; i < lastBlock.length; i++) {
          if (lastBlock[i].hash === block.hash) {
            hashExists = true;
            lastBlock[i].rank += 1;
          }
        }

        if (!hashExists) {
          lastBlock.push(block);
        }
      } else if (receivedBlockNumber > lastBlockNumber) {
        lastBlock = [];
        lastBlock.push(block);
      }

      lastBlock = this.lodash.orderBy(lastBlock, ['rank'], ['desc']);
      this.cache.setVar('lastBlock', JSON.stringify(lastBlock), this.appConfig.CACHE_LAST_BLOCK_EXPIRE);
      this.log.debug(`Set 'lastBlock' into CACHE: '${lastBlock[0].number}' => ${JSON.stringify(lastBlock)}`);
    });
  }
}
