import AbstractController from './AbstractController.js';

export default class ConnectionController extends AbstractController {
  async addLog(spark, params) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let requestValidation = {
      request: {
        type: 'object',
        additionalProperties: false,
        properties: {
          isConnected: {type: 'boolean'}
        },
        required: ['isConnected']
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
      let connectionParams = {
        nodeName: nodeName,
        isConnected: params.isConnected
      };

      this.log.debug(`[${spark.id}] - DB insert connection log => ${JSON.stringify(params)}`);
      this.models.ConnectionLogs.add(connectionParams);
    } else {
      responseObject.success = false;
      responseObject.errors.push('Not logged in');
    }

    return responseObject;
  }
}
