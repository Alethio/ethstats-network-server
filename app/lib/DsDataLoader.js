import ethonDictionary from './EthonDictionary.js';
import BlockUtils from './BlockUtils.js';

export default class DsDataLoader {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.models = diContainer.models;
    this.deepstream = diContainer.deepstream;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.log = diContainer.logger;
    this.result = diContainer.result;
  }

  initNodeCount(params) {
    let dsNodeCountId = `${this.appConfig.DEEPSTREAM_NAMESPACE}/stats/nodeCountData`;

    let statsList = this.deepstream.record.getList(`${this.appConfig.DEEPSTREAM_NAMESPACE}/stats`);
    statsList.whenReady(list => {
      if (!list.getEntries().includes(dsNodeCountId)) {
        list.addEntry(dsNodeCountId);
      }
    });

    if (params.resetDsData) {
      this.setRecord(dsNodeCountId, 'nodeCountData', {active: 0});
    } else {
      this.models.Nodes.getAllActive().then(result => {
        if (result.rowLength > 0) {
          this.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/stats/nodeCountData`, 'nodeCountData', {
            active: result.rowLength
          });
        }
      });
    }
  }

  initLastBlock() {
    return this.models.Blocks.getLastBlockData().then(lastBlock => {
      if (lastBlock) {
        delete lastBlock.date;
        lastBlock.timestamp = new Date(lastBlock.timestamp * 1000);
      }

      let dsLastBlockId = `${this.appConfig.DEEPSTREAM_NAMESPACE}/stats/lastBlockData`;

      let statsList = this.deepstream.record.getList(`${this.appConfig.DEEPSTREAM_NAMESPACE}/stats`);
      statsList.whenReady(list => {
        if (!list.getEntries().includes(dsLastBlockId)) {
          list.addEntry(dsLastBlockId);
        }
      });

      this.setRecord(dsLastBlockId, 'lastBlockData', lastBlock);

      return lastBlock;
    });
  }

  initNodes(params) {
    return this.models.Nodes.getAllActive().then(data => {
      let nodePromises = [];

      if (data && data.rowLength > 0) {
        for (let i = 0; i < data.rowLength; i++) {
          if (params.resetDsData) {
            data.rows[i].isActive = false;
          }

          nodePromises.push(this._getNodeData(data.rows[i]));
        }

        return Promise.all(nodePromises).then(results => {
          let nodesListEntries = [];

          for (let i = 0; i < results.length; i++) {
            let dsNodeId = `${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${results[i].nodeData.nodeName}`;
            nodesListEntries.push(dsNodeId);

            Object.keys(results[i]).forEach(nodeRecord => {
              this.setRecord(`${dsNodeId}/${nodeRecord}`, nodeRecord, results[i][nodeRecord]);
            });

            if (results.length === i + 1) {
              this.deepstream.record.getList(`${this.appConfig.DEEPSTREAM_NAMESPACE}/nodes`).whenReady(list => {
                list.setEntries(nodesListEntries);
              });
            }
          }

          return nodePromises.length;
        });
      }

      return nodePromises.length;
    });
  }

  _getNodeData(node) {
    let nodeName = node.nodeName;

    let allPromises = [
      this.models.AuthLogs.get({nodeName: nodeName, order: 'asc', limit: 1}),
      this.models.AuthLogs.get({nodeName: nodeName, order: 'desc', limit: 1}),
      this.models.Syncs.get({nodeName: nodeName, order: 'desc', limit: 1}),
      this.models.Stats.get({nodeName: nodeName, order: 'desc', limit: 1}),
      this.models.BlockConfirmations.get({nodeName: nodeName, order: 'desc', limit: this.appConfig.CHARTS_NODE_BLOCK_PROPAGATION_MAX_BINS}),
      this.models.Usage.get({nodeName: nodeName, order: 'desc', limit: 1})
    ];

    return Promise.all(allPromises).then(results => {
      let nodeData = {
        nodeData: node,
        firstLogin: (results[0] && results[0].rowLength > 0) ? results[0].rows[0] : null,
        lastLogin: (results[1] && results[1].rowLength > 0) ? results[1].rows[0] : null,
        lastSync: (results[2] && results[2].rowLength > 0) ? results[2].rows[0] : null,
        lastStat: (results[3] && results[3].rowLength > 0) ? results[3].rows[0] : null,
        lastConfirmations: (results[4] && results[4].rowLength > 0) ? results[4].rows : null,
        lastBlock: null,
        lastUsage: (results[5] && results[5].rowLength > 0) ? results[5].rows[0] : null
      };

      if (nodeData.lastConfirmations === null) {
        return this.result.setupNodeData(nodeData, true);
      }

      return this.models.Blocks.getBlock({number: nodeData.lastConfirmations[0].blockNumber, hash: nodeData.lastConfirmations[0].blockHash}).then(async lastBlock => {
        nodeData.lastBlock = lastBlock;

        if (nodeData.lastBlock) {
          if (this.appConfig.NETWORK_ALGO === 'ibft2' && nodeData.lastBlock.extraData) {
            nodeData.lastBlock.validators = BlockUtils.getIBFT2Validators(nodeData.lastBlock.extraData);
          }

          if (this.appConfig.NETWORK_ALGO === 'clique') {
            let validators = await this.models.Validators.get({blockNumber: nodeData.lastBlock.number, blockHash: nodeData.lastBlock.hash});
            nodeData.lastBlock.validators = (validators && validators.rowLength > 0) ? JSON.parse(validators.rows[0].validators) : [];
          }
        }

        return this.result.setupNodeData(nodeData, true);
      });
    });
  }

  initCleanUp() {
    setInterval(() => {
      this.models.Nodes.getAllActive().then(result => {
        if (result.rowLength > 0) {
          let activeNodes = [];
          this.lodash.forEach(result.rows, node => {
            activeNodes.push(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${node.nodeName}`);
          });

          this.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/stats/nodeCountData`, 'nodeCountData', {
            active: activeNodes.length
          });

          let currentNodes = this.deepstream.record.getList(`${this.appConfig.DEEPSTREAM_NAMESPACE}/nodes`);
          currentNodes.whenReady(list => {
            this.lodash.forEach(list.getEntries(), dsNodeId => {
              if (!activeNodes.includes(dsNodeId)) {
                list.removeEntry(dsNodeId);

                this.deleteRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/${dsNodeId}/nodeData`);
                this.deleteRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/${dsNodeId}/nodeSyncInfo`);
                this.deleteRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/${dsNodeId}/nodeStatistics`);
                this.deleteRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/${dsNodeId}/nodeBlockData`);
                this.deleteRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/${dsNodeId}/nodeUsage`);
              }
            });
          });
        }
      });
    }, this.appConfig.DEEPSTREAM_CLEANUP_INTERVAL * 1000);
  }

  initPingPongRpc() {
    this.log.debug('Deepstream provide \'pingPong\' RPC');

    try {
      this.deepstream.rpc.provide('pingPong', (timestamp, response) => {
        let validTimestamp = new Date(parseInt(timestamp, 10)).getTime() > 0;

        if (validTimestamp) {
          response.send(timestamp);
          this.prometheusMetrics.ethstats_server_deepstream_requests_total.inc({topic: 'pingPong'}, 1, Date.now());
          this.log.debug(`Deepstream 'pingPong' response: ${timestamp}`);
        } else {
          let errorMessage = 'Error: Invalid timestamp!';
          response.error(errorMessage);
          this.log.debug(`Deepstream 'pingPong' response: ${errorMessage}, value: ${timestamp}`);
        }
      });
    } catch (error) {
      this.log.error('Deepstream => ' + error.message);
    }
  }

  setRecord(recordId, key, value) {
    this.deepstream.record.getRecord(recordId).whenReady(record => {
      let formattedKey = this.result.formatData(key);
      let formattedData = this.result.formatData(value);
      record.set(formattedKey, formattedData);
      this.prometheusMetrics.ethstats_server_deepstream_requests_total.inc({topic: formattedKey}, 1, Date.now());
      this.log.debug(`Deepstream record '${recordId}' set '${formattedKey}' => {...}`);
    });
  }

  getRecord(recordId) {
    return this.deepstream.record.getRecord(recordId);
  }

  deleteRecord(recordId) {
    this.deepstream.record.getRecord(recordId).whenReady(record => {
      record.delete();
      this.prometheusMetrics.ethstats_server_deepstream_requests_total.inc({topic: 'deleteRecord'}, 1, Date.now());
      this.log.debug(`Deepstream record '${recordId}' delete`);
    });
  }

  sendValidatorsToDeepstream(validators) {
    this.log.debug(`Deepstream update 'validators': ${JSON.stringify(validators)}`);

    let nodesList = this.deepstream.record.getList(`${this.appConfig.DEEPSTREAM_NAMESPACE}/nodes`);
    nodesList.whenReady(list => {
      list.getEntries().forEach(dsNodeId => {
        this.getRecord(`${dsNodeId}/nodeData`).whenReady(node => {
          let nodeData = node.get()[ethonDictionary.nodeData];
          if (nodeData) {
            if (validators.includes(nodeData[ethonDictionary.coinbase])) {
              this.setRecord(`${dsNodeId}/nodeData`, 'nodeData.isValidator', true);
            }
          }
        });
      });
    });
  }
}
