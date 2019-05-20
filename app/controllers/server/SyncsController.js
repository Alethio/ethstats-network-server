import AbstractController from './AbstractController.js';

export default class SyncsController extends AbstractController {
  async add(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: true,
        properties: {
          syncOperation: {type: 'string'},
          startingBlock: {type: 'integer'},
          currentBlock: {type: 'integer'},
          highestBlock: {type: 'integer'}
        },
        required: ['startingBlock', 'currentBlock', 'highestBlock']
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
      let nodeName = session.nodeName;
      let syncParams = {
        nodeName: nodeName,
        syncOperation: params.syncOperation,
        startingBlock: params.startingBlock,
        currentBlock: params.currentBlock,
        highestBlock: params.highestBlock
      };

      this.log.debug(`[${spark.id}] - DB insert sync => ${JSON.stringify(syncParams)}`);
      this.models.Syncs.add(syncParams).then(() => {
        delete syncParams.progress;
        delete syncParams.nodeName;
        this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${nodeName}/nodeSyncInfo`, 'nodeSyncInfo', syncParams);
      });

      this.requestCheckChain(spark, {
        receivedBlockNumber: params.currentBlock,
        checkChainLastRequestedBlockNumber: session.checkChainLastRequestedBlockNumber,
        checkChainRequestCount: session.checkChainRequestCount,
        chainDetectionRate: this.appConfig.CHAIN_DETECTION_RATE_ON_SYNC
      });
    } else {
      responseObject.success = false;
      responseObject.errors.push('Not logged in');
    }

    return responseObject;
  }
}
