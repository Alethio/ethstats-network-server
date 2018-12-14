export default class AbstractController {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.validator = diContainer.validator;
    this.validatorError = diContainer.validatorError;

    this.responseObject = {
      statusCode: 200,
      body: {
        success: true,
        data: [],
        dataLength: 0,
        warnings: [],
        errors: []
      }
    };
  }

  sayHello(request, response) {
    let responseObject = this.lodash.cloneDeep(this.responseObject);
    responseObject.body.data = [{
      message: 'Hello world!'
    }];
    return response.status(responseObject.statusCode).json(responseObject);
  }
}
