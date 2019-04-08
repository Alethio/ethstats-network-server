import AbstractModel from './AbstractModel';

export default class Nodes extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'nodes';
  }

  async add(params) {
    let tableLength = this.jsonDB[this.table].push({
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
      this.jsonDB[this.table].shift();
    }

    return this.jsonDB[this.table].length;
  }

  async getByNodeName(nodeName) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    returnObject.rows = this.lodash.filter(this.jsonDB[this.table], {
      nodeName: nodeName
    });
    returnObject.rowLength = returnObject.rows.length;

    return returnObject;
  }

  async getByAccountEmail(accountEmail) {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    returnObject.rows = this.lodash.filter(this.jsonDB[this.table], {
      accountEmail: accountEmail
    });
    returnObject.rowLength = returnObject.rows.length;

    return returnObject;
  }

  async getAll() {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    returnObject.rows = this.jsonDB[this.table];
    returnObject.rowLength = returnObject.rows.length;

    return returnObject;
  }

  async getAllActive() {
    let returnObject = this.lodash.cloneDeep(this.returnObject);

    returnObject.rows = this.lodash.filter(this.jsonDB[this.table], row => {
      return row.isActive === true && new Date(row.lastActivityTimestamp).getTime() >= Date.now() - (this.appConfig.DEEPSTREAM_NODE_ACTIVITY_RETENTION * 1000);
    });
    returnObject.rowLength = returnObject.rows.length;

    return returnObject;
  }
}
