import AbstractController from './AbstractController.js';

export default class StatsController extends AbstractController {
  async add(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: true,
        properties: {
          mining: {type: 'boolean'},
          peers: {type: 'integer'},
          hashrate: {type: ['integer', 'string']},
          gasPrice: {type: ['integer', 'string']},
          pendingTXs: {type: 'integer'}
        },
        required: ['mining', 'peers', 'hashrate', 'gasPrice', 'pendingTXs']
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
      let statsParams = {
        nodeName: nodeName,
        isMining: params.mining,
        peerCount: params.peers,
        hashrate: params.hashrate.toString(),
        gasPrice: params.gasPrice.toString(),
        wsLatency: session.latency
      };

      this.log.debug(`[${spark.id}] - DB insert stats => ${JSON.stringify(statsParams)}`);
      this.models.Stats.add(statsParams).then(() => {
        delete statsParams.nodeName;
        delete statsParams.wsLatency;
        this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${nodeName}/nodeStatistics`, 'nodeStatistics', statsParams);
      });
    } else {
      responseObject.success = false;
      responseObject.errors.push('Not logged in');
    }

    return responseObject;
  }
}
