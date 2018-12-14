import AbstractController from './AbstractController.js';

export default class UsageController extends AbstractController {
  async add(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          hostCpuLoad: {type: 'number'},
          hostMemTotal: {type: 'number'},
          hostMemUsed: {type: 'number'},
          hostNetRxSec: {type: 'number'},
          hostNetTxSec: {type: 'number'},
          hostFsRxSec: {type: 'number'},
          hostFsWxSec: {type: 'number'},
          hostDiskRIOSec: {type: 'number'},
          hostDiskWIOSec: {type: 'number'},
          nodeCpuLoad: {type: 'number'},
          nodeMemLoad: {type: 'number'},
          clientCpuLoad: {type: 'number'},
          clientMemLoad: {type: 'number'}
        },
        required: [
          'hostCpuLoad',
          'hostMemTotal',
          'hostMemUsed',
          'hostNetRxSec',
          'hostNetTxSec',
          'hostFsRxSec',
          'hostFsWxSec',
          'hostDiskRIOSec',
          'hostDiskWIOSec',
          'nodeCpuLoad',
          'nodeMemLoad',
          'clientCpuLoad',
          'clientMemLoad'
        ]
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
      let usageParams = {
        nodeName: nodeName,
        hostCpuLoad: params.hostCpuLoad,
        hostMemTotal: params.hostMemTotal,
        hostMemUsed: params.hostMemUsed,
        hostNetRxSec: params.hostNetRxSec,
        hostNetTxSec: params.hostNetTxSec,
        hostFsRxSec: params.hostFsRxSec,
        hostFsWxSec: params.hostFsWxSec,
        hostDiskRIOSec: params.hostDiskRIOSec,
        hostDiskWIOSec: params.hostDiskWIOSec,
        nodeCpuLoad: params.nodeCpuLoad,
        nodeMemLoad: params.nodeMemLoad,
        clientCpuLoad: params.clientCpuLoad,
        clientMemLoad: params.clientMemLoad
      };

      this.log.debug(`[${spark.id}] - DB insert usage => ${JSON.stringify(usageParams)}`);
      this.models.Usage.add(usageParams).then(() => {
        delete usageParams.nodeName;
        this.dsDataLoader.setRecord(`${this.appConfig.DEEPSTREAM_NAMESPACE}/node/${nodeName}/nodeUsage`, 'nodeUsage', usageParams);
      });
    } else {
      responseObject.success = false;
      responseObject.errors.push('Not logged in');
    }

    return responseObject;
  }
}
