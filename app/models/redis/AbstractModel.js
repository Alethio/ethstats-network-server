export default class AbstractModel {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.redis = diContainer.redis;
    this.namespace = `${this.appConfig.REDIS_NAMESPACE}:db`;

    this.returnObject = {
      rows: [],
      rowLength: 0
    };
  }

  async update(whereParams, params) {
    return this.redis.get(this.table).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);

      let filteredRows = this.lodash.filter(newData, whereParams);
      filteredRows.forEach(row => {
        Object.keys(params).forEach(param => {
          row[param] = params[param];
        });
      });

      this.redis.set(this.table, JSON.stringify(newData));
      return filteredRows.length;
    });
  }
}

