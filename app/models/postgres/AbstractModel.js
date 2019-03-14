export default class AbstractModel {
  constructor(diContainer) {
    this.appConfig = diContainer.appConfig;
    this.lodash = diContainer.lodash;
    this.log = diContainer.logger;
    this.prometheusMetrics = diContainer.prometheusMetrics;
    this.dbClient = diContainer.dbClient;
  }

  executeQuery(query, params) {
    let queryType = query.substr(0, 6).toUpperCase();
    return this.dbClient.query(query, params)
      .then(result => {
        this.prometheusMetrics.ethstats_server_cassandra_requests_total.inc({query_type: queryType}, 1, Date.now());
        result.rowLength = result.rowCount;
        return result;
      })
      .catch(error => {
        if (!this.lodash.isEmpty(error)) {
          this.log.error('Postgres => ' + error.message + ' in query: ' + query);
          return error;
        }
      });
  }

  update(whereParams, params) {
    let queryFields = [];
    let queryWhereFields = [];
    let queryParamIdx = 0;
    let queryParams = [];
    let result = false;

    for (var param in params) {
      if (!this.lodash.isUndefined(params[param])) {
        queryParamIdx++;
        queryFields.push(`"${param}" = $${queryParamIdx}`);
        queryParams.push(params[param]);
      }
    }

    for (var whereParam in whereParams) {
      if (!this.lodash.isUndefined(whereParams[whereParam])) {
        queryParamIdx++;
        queryWhereFields.push(`"${whereParam}" = $${queryParamIdx}`);
        queryParams.push(whereParams[whereParam]);
      }
    }

    if (queryFields.length > 0) {
      let query = `UPDATE ${this.table} SET ${queryFields.join(', ')} WHERE ${queryWhereFields.join(' AND ')}`;
      result = this.executeQuery(query, queryParams);
    }

    return result;
  }
}

