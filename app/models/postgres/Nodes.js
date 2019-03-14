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
    ) VALUES ($1, $2, $3, $4, $5, NOW())`;
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
    let query = 'SELECT * FROM nodes WHERE "nodeShard" = $1 AND "nodeName" = $2';
    let shardName = nodeName.charAt(0).toLowerCase();
    let queryParams = [shardName, nodeName];

    return this.executeQuery(query, queryParams);
  }

  getByAccountEmail(accountEmail) {
    let query = 'SELECT * FROM nodes WHERE "accountEmail" = $1';
    let queryParams = [accountEmail];

    return this.executeQuery(query, queryParams);
  }

  getAll() {
    let query = 'SELECT * FROM nodes';
    let queryParams = [];

    return this.executeQuery(query, queryParams);
  }

  getAllActive() {
    let query = 'SELECT * FROM nodes WHERE "isActive" = True and "lastActivityTimestamp" >= $1';
    let retentionTime = Date.now() - (this.appConfig.DEEPSTREAM_NODE_ACTIVITY_RETENTION * 1000);

    let queryParams = [new Date(retentionTime).toISOString()];

    return this.executeQuery(query, queryParams);
  }
}
