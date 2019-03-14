import AbstractModel from './AbstractModel';

export default class Tools extends AbstractModel {
  async truncateAllTables(truncateNodesTable = false) {
    let results = [];
    let tables = [
      'connection_logs',
      'auth_logs',
      'syncs',
      'stats',
      'blocks',
      'block_transactions',
      'block_uncles',
      'block_confirmations',
      'usage',
      'node_recovery_requests'
    ];

    if (truncateNodesTable) {
      tables.push('nodes');
    }

    for (let table of tables) {
      this.redis.set(`${this.namespace}:${table}`, JSON.stringify([]));
    }

    return results;
  }
}
