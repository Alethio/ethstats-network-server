import AbstractController from './AbstractController.js';
const clientConfigs = require(`../../../config/ClientConfigs.${process.env.ENVIRONMENT}.js`);

export default class ConfigsController extends AbstractController {
  get(request, response) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    let configName = request.params.configName;
    let configParams = request.query.configParams;

    this.log.debug(`Get config: '${JSON.stringify(configName)}' params: ${JSON.stringify(configParams)}`);

    let requestValidation = {
      query: {
        type: 'object',
        additionalProperties: false,
        properties: {
          configParams: {type: 'object'}
        }
      }
    };

    let validParams = this.validator.validate(requestValidation.query, request.query);
    if (!validParams) {
      responseObject.statusCode = 400;
      responseObject.body.success = false;
      responseObject.body.errors = this.validatorError.getReadableErrorMessages(this.validator.errors);

      return response.status(responseObject.statusCode).json(responseObject);
    }

    let result = clientConfigs[configName];

    if (result === undefined) {
      responseObject.statusCode = 404;
      responseObject.body.success = false;
      responseObject.body.errors.push(`Config name '${configName}' does not exist`);

      return response.status(responseObject.statusCode).json(responseObject);
    }

    let dashboardUrlBackwardsCompatibility = false;
    if (configName === 'dashboardUrl' && this.lodash.isEmpty(configParams)) {
      dashboardUrlBackwardsCompatibility = true;
      configParams = {
        networkName: 'mainnet'
      };
    }

    if (!this.lodash.isEmpty(configParams)) {
      result = this.lodash.find(clientConfigs[configName], configParams);

      if (result === undefined) {
        responseObject.statusCode = 404;
        responseObject.body.success = false;
        responseObject.body.errors.push(`Config param '${JSON.stringify(configParams)}' does not exist`);

        return response.status(responseObject.statusCode).json(responseObject);
      }

      if (result && dashboardUrlBackwardsCompatibility) {
        result = result.url;
      }
    }

    responseObject.body.data.push(result);
    responseObject.body.dataLength = responseObject.body.data.length;

    return response.status(responseObject.statusCode).json(responseObject);
  }
}
