export default class AbstractController {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.cache = diContainer.cache;
    this.models = diContainer.models;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.result = diContainer.result;
    this.validator = diContainer.validator;
    this.validatorError = diContainer.validatorError;
    this.statistics = diContainer.statistics;
    this.sha1 = diContainer.sha1;
    this.mailer = diContainer.mailer;

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
