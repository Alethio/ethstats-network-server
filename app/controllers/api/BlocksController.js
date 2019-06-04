import AbstractController from './AbstractController.js';
import BlockUtils from '../../lib/BlockUtils.js';

export default class BlocksController extends AbstractController {
  get(request, response) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    request.params.blockNumber = parseInt(request.params.blockNumber, 10);

    let requestValidation = {
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          blockNumber: {type: 'integer'}
        },
        required: ['blockNumber']
      }
    };

    let validParams = this.validator.validate(requestValidation.params, request.params);
    if (!validParams) {
      responseObject.statusCode = 400;
      responseObject.body.success = false;
      responseObject.body.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return response.status(responseObject.statusCode).json(responseObject);
    }

    this.models.Blocks.getBlock({number: request.params.blockNumber}).then(block => {
      if (block === null) {
        responseObject.statusCode = 404;
        responseObject.body.success = false;
        responseObject.body.errors = ['Block not found'];

        return response.status(responseObject.statusCode).json(responseObject);
      }

      let allPromises = [
        this.models.BlockTransactions.getByBlockHash(block.hash),
        this.models.BlockUncles.getByBlockHash(block.hash)
      ];

      Promise.all(allPromises).then(result => {
        let transactions = result[0];
        let txHashes = [];
        for (let i = 0; i < transactions.rowLength; i++) {
          txHashes.push(transactions.rows[i].txHash);
        }

        let uncles = result[1];
        let uncleHashes = [];
        for (let i = 0; i < uncles.rowLength; i++) {
          uncleHashes.push(uncles.rows[i].uncleHash);
        }

        block.transactions = txHashes;
        block.uncles = uncleHashes;

        responseObject.body.data.push(this.result.formatData(block));
        responseObject.body.dataLength = responseObject.body.data.length;

        return response.status(responseObject.statusCode).json(responseObject);
      });
    });
  }

  getNodes(request, response) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    request.params.blockNumber = parseInt(request.params.blockNumber, 10);

    let requestValidation = {
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          blockNumber: {type: 'integer'}
        },
        required: ['blockNumber']
      }
    };

    let validParams = this.validator.validate(requestValidation.params, request.params);
    if (!validParams) {
      responseObject.statusCode = 400;
      responseObject.body.success = false;
      responseObject.body.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return response.status(responseObject.statusCode).json(responseObject);
    }

    this.models.Blocks.getBlock({number: request.params.blockNumber}).then(block => {
      if (block === null) {
        responseObject.statusCode = 404;
        responseObject.body.success = false;
        responseObject.body.errors = ['Block not found'];

        return response.status(responseObject.statusCode).json(responseObject);
      }

      this.models.BlockConfirmations.get({blockNumber: request.params.blockNumber}).then(data => {
        if (data && data.rowLength > 0) {
          let allPromises = [];
          this.lodash.each(data.rows, confirmation => {
            allPromises.push(this._getNodeData(confirmation));
          });

          Promise.all(allPromises).then(result => {
            this.lodash.each(result, nodeData => {
              responseObject.body.data.push(this.result.formatData(nodeData));
            });
            responseObject.body.dataLength = responseObject.body.data.length;

            return response.status(responseObject.statusCode).json(responseObject);
          });
        } else {
          return response.status(responseObject.statusCode).json(responseObject);
        }
      });
    });
  }

  _getNodeData(params) {
    let nodeName = params.nodeName;
    let confirmationTimestamp = params.confirmationTimestamp;

    let allPromises = [
      this.models.Nodes.getByNodeName(nodeName),
      this.models.AuthLogs.get({nodeName: nodeName, order: 'asc', limit: 1}),
      this.models.AuthLogs.get({nodeName: nodeName, timestampEnd: confirmationTimestamp, order: 'desc', limit: 1}),
      this.models.Syncs.get({nodeName: nodeName, timestampEnd: confirmationTimestamp, order: 'desc', limit: 1}),
      this.models.Stats.get({nodeName: nodeName, timestampEnd: confirmationTimestamp, order: 'desc', limit: 1}),
      this.models.BlockConfirmations.get({
        nodeName: nodeName,
        timestampEnd: confirmationTimestamp,
        order: 'desc',
        limit: this.appConfig.CHARTS_NODE_BLOCK_PROPAGATION_MAX_BINS
      }),
      this.models.Blocks.getBlock({number: params.blockNumber, hash: params.blockHash}),
      this.models.Usage.get({nodeName: nodeName, timestampEnd: confirmationTimestamp, order: 'desc', limit: 1})
    ];

    return Promise.all(allPromises).then(async results => {
      let nodeData = {
        nodeData: (results[0] && results[0].rowLength > 0) ? results[0].rows[0] : null,
        firstLogin: (results[1] && results[1].rowLength > 0) ? results[1].rows[0] : null,
        lastLogin: (results[2] && results[2].rowLength > 0) ? results[2].rows[0] : null,
        lastSync: (results[3] && results[3].rowLength > 0) ? results[3].rows[0] : null,
        lastStat: (results[4] && results[4].rowLength > 0) ? results[4].rows[0] : null,
        lastConfirmations: (results[5] && results[5].rowLength > 0) ? results[5].rows : null,
        lastBlock: results[6],
        lastUsage: (results[7] && results[7].rowLength > 0) ? results[7].rows[0] : null
      };

      if (nodeData.lastLogin === null) {
        nodeData.lastLogin = nodeData.firstLogin;
      }

      if (nodeData.lastBlock) {
        if (this.appConfig.NETWORK_ALGO === 'ibft2' && nodeData.lastBlock.extraData) {
          nodeData.lastBlock.validators = BlockUtils.getIBFT2Validators(nodeData.lastBlock.extraData);
        }

        if (this.appConfig.NETWORK_ALGO === 'clique') {
          let validators = await this.models.Validators.get({blockNumber: nodeData.lastBlock.number, blockHash: nodeData.lastBlock.hash});
          nodeData.lastBlock.validators = (validators && validators.rowLength > 0) ? JSON.parse(validators.rows[0].validators) : [];
        }
      }

      nodeData.nodeData.isActive = true;
      return this.result.setupNodeData(nodeData, false);
    });
  }

  getStatistics(request, response) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    request.params.blockNumber = parseInt(request.params.blockNumber, 10);

    let requestValidation = {
      params: {
        type: 'object',
        additionalProperties: false,
        properties: {
          blockNumber: {type: 'integer'}
        },
        required: ['blockNumber']
      }
    };

    let validParams = this.validator.validate(requestValidation.params, request.params);
    if (!validParams) {
      responseObject.statusCode = 400;
      responseObject.body.success = false;
      responseObject.body.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return response.status(responseObject.statusCode).json(responseObject);
    }

    this.models.Blocks.getBlock({number: request.params.blockNumber}).then(block => {
      if (block === null) {
        responseObject.statusCode = 404;
        responseObject.body.success = false;
        responseObject.body.errors = ['Block not found'];

        return response.status(responseObject.statusCode).json(responseObject);
      }

      this.statistics.getData(block.number, this.models.Blocks.getNumberPartitionKey(block.timestamp * 1000)).then(data => {
        responseObject.body.data.push(this.result.formatData(data));
        responseObject.body.dataLength = responseObject.body.data.length;

        return response.status(responseObject.statusCode).json(responseObject);
      });
    });
  }

  getLast(request, response) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);

    this.cache.getVar('lastBlock').then(data => {
      let lastBlock = (data === null) ? null : JSON.parse(data);
      lastBlock = (lastBlock && lastBlock.length > 0) ? lastBlock[0] : null;

      if (lastBlock === null) {
        responseObject.statusCode = 404;
        responseObject.body.success = false;
        responseObject.body.errors = ['Block not found'];

        return response.status(responseObject.statusCode).json(responseObject);
      }

      this.models.Nodes.getAllActive().then(nodes => {
        responseObject.body.data.push(this.result.formatData({
          number: lastBlock.number,
          hash: lastBlock.hash,
          parentHash: lastBlock.parentHash,
          rank: lastBlock.rank,
          totalNodes: nodes.rowLength
        }));
        responseObject.body.dataLength = responseObject.body.data.length;

        return response.status(responseObject.statusCode).json(responseObject);
      });
    });
  }
}
