export default class AbstractController {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.cache = diContainer.cache;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.models = diContainer.models;
    this.deepstream = diContainer.deepstream;
    this.dsDataLoader = diContainer.dsDataLoader;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.result = diContainer.result;
    this.statistics = diContainer.statistics;
    this.infura = diContainer.infura;
    this.bigNumberUtils = diContainer.bigNumberUtils;
  }
}
