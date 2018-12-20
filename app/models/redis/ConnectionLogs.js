import AbstractModel from './AbstractModel';

export default class ConnectionLogs extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = `${this.namespace}:connection_logs`;
  }

  async add(params) {
    return this.redis.get(this.table).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      let tableLength = newData.push({
        nodeName: params.nodeName,
        isConnected: params.isConnected,
        receivedTimestamp: Date.now()
      });

      if (tableLength > this.appConfig.LITE_DB_LIMIT) {
        newData.shift();
      }

      this.redis.set(this.table, JSON.stringify(newData));
      return newData.length;
    });
  }

  /*
   * Get params
   *
   * nodeName
   * timestampStart
   * timestampEnd
   * order
   * limit
   * countOnly
   */
  async get(params) {
    if (this.lodash.isEmpty(params)) {
      return null;
    }

    let returnObject = this.lodash.cloneDeep(this.returnObject);

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        returnObject.rows = JSON.parse(data);

        if (params.nodeName) {
          returnObject.rows = this.lodash.filter(returnObject.rows, {nodeName: params.nodeName});
        }

        if (params.timestampStart) {
          returnObject.rows = this.lodash.filter(returnObject.rows, row => {
            return row.receivedTimestamp >= params.timestampStart;
          });
        }

        if (params.timestampEnd) {
          returnObject.rows = this.lodash.filter(returnObject.rows, row => {
            return row.receivedTimestamp <= params.timestampEnd;
          });
        }

        if (params.order) {
          returnObject.rows = this.lodash.orderBy(returnObject.rows, ['receivedTimestamp'], [params.order]);
        }

        if (params.limit) {
          returnObject.rows = this.lodash.slice(returnObject.rows, 0, params.limit);
        }

        if (params.countOnly) {
          returnObject.rows = [{
            count: returnObject.rows.length
          }];
        }

        returnObject.rowLength = returnObject.rows.length;
      }

      return returnObject;
    });
  }
}
