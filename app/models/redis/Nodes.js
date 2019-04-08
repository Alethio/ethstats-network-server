import AbstractModel from './AbstractModel';

export default class Nodes extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = `${this.namespace}:nodes`;
  }

  async add(params) {
    return this.redis.get(this.table).then(data => {
      let newData = (data === null) ? [] : JSON.parse(data);
      let tableLength = newData.push({
        nodeShard: params.nodeName.charAt(0).toLowerCase(),
        nodeName: params.nodeName,
        accountEmail: params.accountEmail,
        secretKey: params.secretKey,
        isActive: false,
        lastIp: params.lastIp,
        createdTimestamp: Date.now(),
        lastActivityTimestamp: null,
        lastLoginTimestamp: null,
        lastLogoutTimestamp: null,
        totalOnlineTime: 0
      });

      if (tableLength > this.appConfig.LITE_DB_LIMIT) {
        newData.shift();
      }

      this.redis.set(this.table, JSON.stringify(newData));
      return newData.length;
    });
  }

  async getByNodeName(nodeName) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        returnObject.rows = this.lodash.filter(JSON.parse(data), {
          nodeName: nodeName
        });
        returnObject.rowLength = returnObject.rows.length;
      }

      return returnObject;
    });
  }

  async getByAccountEmail(accountEmail) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        returnObject.rows = this.lodash.filter(JSON.parse(data), {
          accountEmail: accountEmail
        });
        returnObject.rowLength = returnObject.rows.length;
      }

      return returnObject;
    });
  }

  async getAll() {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        returnObject.rows = JSON.parse(data);
        returnObject.rowLength = returnObject.rows.length;
      }

      return returnObject;
    });
  }

  async getAllActive() {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    return this.redis.get(this.table).then(data => {
      if (data !== null) {
        returnObject.rows = this.lodash.filter(JSON.parse(data), row => {
          return row.isActive === true && new Date(row.lastActivityTimestamp).getTime() >= Date.now() - (this.appConfig.DEEPSTREAM_NODE_ACTIVITY_RETENTION * 1000);
        });
        returnObject.rowLength = returnObject.rows.length;
      }

      return returnObject;
    });
  }
}
