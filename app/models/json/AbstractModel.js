export default class AbstractModel {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.jsonDB = diContainer.jsonDB;

    this.returnObject = {
      rows: [],
      rowLength: 0
    };
  }

  async update(whereParams, params) {
    let filteredRows = this.lodash.filter(this.jsonDB[this.table], whereParams);
    filteredRows.forEach(row => {
      Object.keys(params).forEach(param => {
        row[param] = params[param];
      });
    });

    return filteredRows.length;
  }
}

