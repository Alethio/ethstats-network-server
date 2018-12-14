import AbstractModel from './AbstractModel';

export default class Nodes extends AbstractModel {
  constructor(diContainer) {
    super(diContainer);
    this.table = 'nodes';
  }

  add(params) {
    let query = `INSERT INTO nodes (
      "nodeShard",
      "nodeName",
      "accountEmail",
      "secretKey",
      "lastIp",
      "createdTimestamp"
    ) VALUES (?, ?, ?, ?, ?, toTimestamp(now()))`;
    let queryParams = [
      params.nodeName.charAt(0).toLowerCase(),
      params.nodeName,
      params.accountEmail,
      params.secretKey,
      params.lastIp
    ];

    return this.executeQuery(query, queryParams);
  }

  getByNodeName(nodeName) {
    let query = 'SELECT * FROM nodes WHERE "nodeShard" = ? AND "nodeName" = ?';
    let shardName = nodeName.charAt(0).toLowerCase();
    let queryParams = [shardName, nodeName];

    return this.executeQuery(query, queryParams);
  }

  getByAccountEmail(accountEmail) {
    let query = 'SELECT * FROM nodes WHERE "accountEmail" = ?';
    let queryParams = [accountEmail];

    return this.executeQuery(query, queryParams);
  }

  getAll() {
    let query = 'SELECT * FROM nodes';
    let queryParams = [];

    return this.executeQuery(query, queryParams);
  }

  getAllActive() {
    let query = 'SELECT * FROM nodes WHERE "isActive" = True and "lastActivityTimestamp" >= ? ALLOW FILTERING';
    let retentionTime = Date.now() - (this.appConfig.DEEPSTREAM_NODE_ACTIVITY_RETENTION * 1000);
    let queryParams = [retentionTime];

    return this.executeQuery(query, queryParams);
  }
}
