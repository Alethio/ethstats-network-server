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
    return this.dbClient.execute(query, params, {prepare: true, fetchSize: 10000})
      .then(result => {
        this.prometheusMetrics.ethstats_server_cassandra_requests_total.inc({query_type: queryType}, 1, Date.now());
        return result;
      })
      .catch(error => {
        if (!this.lodash.isEmpty(error)) {
          this.log.error('Cassandra => ' + error.message + ' in query: ' + query);
          return error;
        }
      });
  }

  executeBatch(queries) {
    return this.dbClient.batch(queries, {prepare: true})
      .then(result => {
        this.prometheusMetrics.ethstats_server_cassandra_requests_total.inc({query_type: 'BATCH'}, 1, Date.now());
        return result;
      })
      .catch(error => {
        if (!this.lodash.isEmpty(error)) {
          this.log.error('Cassandra => ' + error.message + ' in batch: ' + JSON.stringify(queries));
          return error;
        }
      });
  }

  update(whereParams, params) {
    let queryFields = [];
    let queryWhereFields = [];
    let queryParams = [];
    let result = false;

    for (var param in params) {
      if (!this.lodash.isUndefined(params[param])) {
        queryFields.push(`"${param}" = ?`);
        queryParams.push(params[param]);
      }
    }

    for (var whereParam in whereParams) {
      if (!this.lodash.isUndefined(whereParams[whereParam])) {
        queryWhereFields.push(`"${whereParam}" = ?`);
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

